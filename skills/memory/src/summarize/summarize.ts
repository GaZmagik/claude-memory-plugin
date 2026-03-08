/**
 * Core Summarisation Module
 *
 * Feature: 006-memory-summarize (v1.8.0)
 *
 * Security note: All memory IDs passed to readMemory() are sourced from
 * listMemories() index results or validated caller-supplied digestId values.
 * Path traversal prevention is handled inside readMemory() itself (isInsideDir /
 * isValidExternalPath checks). This module does not construct file paths directly.
 */

import { generate, isAvailable } from '../services/ollama.js';
import { listMemories } from '../core/list.js';
import { readMemory } from '../core/read.js';
import type { MemorySummary, ListMemoriesRequest } from '../types/api.js';
import { MemoryType } from '../types/enums.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CHUNK_BUDGET_RATIO = 0.6;
export const CHARS_PER_TOKEN = 4;
export const MAX_MEMORY_CONTENT_CHARS = 6_000;
export const DEFAULT_TIMEOUT_MS = 120_000;
export const DEFAULT_LIMIT = 50;
export const OLLAMA_UNAVAILABLE_HINT = 'Ollama is not available. Install and start Ollama to enable LLM-powered summaries.';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SummarizeMode = 'per-type' | 'overview' | 'digest';

export interface FallbackListing {
  id: string;
  type: string;
  title: string;
  tags: string[];
}

export type SummarizeResult =
  | { kind: 'per-type'; summaries: Record<string, string>; memoriesIncluded: string[] }
  | { kind: 'overview'; summary: string; memoriesIncluded: string[] }
  | { kind: 'digest'; summary: string; memoriesIncluded: string[] }
  | { kind: 'fallback'; memories: FallbackListing[]; memoriesIncluded: string[]; hint: string }
  | { kind: 'empty'; memoriesIncluded: string[]; hint?: string };

export interface SummarizeRequest {
  basePaths: string[];
  mode: SummarizeMode;
  typeFilter?: MemoryType;
  digestId?: string;
  tags: string[];
  limit: number;
  timeoutMs: number;
  contextWindow: number;
}

// ---------------------------------------------------------------------------
// MemoryLoadEntry — pairs a summary with its source basePath
// ---------------------------------------------------------------------------

export interface MemoryLoadEntry {
  summary: MemorySummary;
  basePath: string;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface MemoryContent {
  id: string;
  type: string;
  title: string;
  tags: string[];
  content: string;
}

interface SummaryChunk {
  memories: MemoryContent[];
  totalChars: number;
}

// ---------------------------------------------------------------------------
// truncateContent
// ---------------------------------------------------------------------------

/**
 * Truncate content to at most maxChars characters at a word boundary.
 * Appends ' [...]' to indicate truncation. Pure function — no side effects.
 */
export function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  const slice = content.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(' ');
  return lastSpace > 0
    ? slice.slice(0, lastSpace) + ' [...]'
    : slice + ' [...]';
}

// ---------------------------------------------------------------------------
// buildChunks
// ---------------------------------------------------------------------------

/**
 * Greedy sequential packing of memories into chunks.
 * Each chunk's totalChars stays at or below chunkBudgetChars.
 * A single oversized memory is placed in its own chunk.
 */
export function buildChunks(memories: MemoryContent[], chunkBudgetChars: number): SummaryChunk[] {
  const chunks: SummaryChunk[] = [];
  let current: SummaryChunk = { memories: [], totalChars: 0 };

  for (const memory of memories) {
    const len = memory.content.length;

    if (current.memories.length === 0) {
      // Always add the first memory to the current chunk (handles oversized case)
      current.memories.push(memory);
      current.totalChars += len;
    } else if (current.totalChars + len <= chunkBudgetChars) {
      current.memories.push(memory);
      current.totalChars += len;
    } else {
      // Flush current chunk and start a new one
      chunks.push(current);
      current = { memories: [memory], totalChars: len };
    }
  }

  if (current.memories.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// buildPrompt
// ---------------------------------------------------------------------------

/**
 * Assemble the LLM prompt for a single generate() call.
 */
export function buildPrompt(
  memories: MemoryContent[],
  mode: SummarizeMode,
  typeLabel?: string
): string {
  if (mode === 'digest') {
    const mem = memories[0];
    if (!mem) return '';
    return [
      'Provide a detailed summary of the following memory for a developer agent.',
      'Include the key points, context, and any actionable implications.',
      '',
      `Memory: ${mem.title}`,
      '',
      mem.content,
      '',
      'Write a detailed summary:',
    ].join('\n');
  }

  if (mode === 'per-type') {
    const memoriesBlock = memories
      .map(m => `## ${m.title}\n${m.content}\n`)
      .join('\n');

    return [
      `Summarise the following ${typeLabel} memories into a concise paragraph for a developer agent.`,
      'Focus on key decisions, patterns, and actionable insights.',
      '',
      'Memories:',
      memoriesBlock,
      'Write a single paragraph summary:',
    ].join('\n');
  }

  // overview
  const memoriesBlock = memories
    .map(m => `## ${m.title} [${m.type}]\n${m.content}\n`)
    .join('\n');

  return [
    'Summarise the following project memories into a single paragraph for a developer agent.',
    'Cover all types: decisions made, lessons learned, and pitfalls to avoid.',
    '',
    'Memories:',
    memoriesBlock,
    'Write a single paragraph summary:',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// buildReducePrompt
// ---------------------------------------------------------------------------

/**
 * Assemble the reduce-phase prompt that merges partial summaries.
 */
export function buildReducePrompt(chunkSummaries: string[]): string {
  const summariesBlock = chunkSummaries.map(s => `- ${s}\n`).join('');

  return [
    'Merge the following partial summaries into a single coherent paragraph.',
    'Do not repeat information; synthesise where possible.',
    '',
    'Partial summaries:',
    summariesBlock,
    'Write a single merged summary:',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// mapReduceSummarize
// ---------------------------------------------------------------------------

/**
 * Map-reduce summarisation over chunks.
 * Single chunk: one generate() call.
 * Multiple chunks: generate() per chunk (map), then generate() for reduce.
 */
export async function mapReduceSummarize(
  chunks: SummaryChunk[],
  mode: SummarizeMode,
  typeLabel: string | undefined,
  timeoutMs: number
): Promise<string> {
  if (chunks.length === 1) {
    const prompt = buildPrompt(chunks[0]!.memories, mode, typeLabel);
    return generate(prompt, undefined, timeoutMs);
  }

  // Map phase — Promise.all is safe because generate() catches all errors and
  // returns ''. If generate() is ever changed to throw, switch to Promise.allSettled.
  const chunkSummaries = await Promise.all(
    chunks.map(chunk => {
      const prompt = buildPrompt(chunk.memories, mode, typeLabel);
      return generate(prompt, undefined, timeoutMs);
    })
  );

  // Filter empty results before reduce phase (failed generate() returns '')
  const validSummaries = chunkSummaries.filter(s => s.length > 0);
  if (validSummaries.length === 0) return '';
  if (validSummaries.length === 1) return validSummaries[0]!;
  const reducePrompt = buildReducePrompt(validSummaries);
  return generate(reducePrompt, undefined, timeoutMs);
}

// ---------------------------------------------------------------------------
// loadMemoryContents
// ---------------------------------------------------------------------------

/**
 * Load full memory content for each MemoryLoadEntry.
 * Each entry carries its own basePath so memories from different scopes
 * are read from their correct location.
 * Reads are parallelised via Promise.allSettled; individual failures are
 * skipped with a stderr warning rather than aborting the batch.
 * Applies content truncation to MAX_MEMORY_CONTENT_CHARS.
 */
export async function loadMemoryContents(
  entries: MemoryLoadEntry[]
): Promise<MemoryContent[]> {
  const settled = await Promise.allSettled(
    entries.map(async (entry) => {
      const { summary, basePath } = entry;
      const response = await readMemory({ id: summary.id, basePath });
      if (response.status === 'error' || !response.memory) {
        throw new Error(response.error ?? 'read failed');
      }

      const rawContent = response.memory.content;
      const content = truncateContent(rawContent, MAX_MEMORY_CONTENT_CHARS);

      return {
        id: summary.id,
        type: summary.type,
        title: summary.title,
        tags: summary.tags,
        content,
      } satisfies MemoryContent;
    })
  );

  const results: MemoryContent[] = [];
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]!;
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      const id = entries[i]!.summary.id;
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      process.stderr.write(`[summarize] Skipping memory ${id}: ${reason}\n`);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// buildFallbackListing
// ---------------------------------------------------------------------------

/**
 * Map MemorySummary array to FallbackListing (no content loading).
 */
export function buildFallbackListing(summaries: MemorySummary[]): FallbackListing[] {
  return summaries.map(s => ({
    id: s.id,
    type: s.type,
    title: s.title,
    tags: s.tags,
  }));
}

// ---------------------------------------------------------------------------
// summarize — main orchestrator
// ---------------------------------------------------------------------------

/**
 * Main summarisation orchestrator.
 *
 * Flow:
 *  1. Digest mode bypasses listing and handles its own Ollama check.
 *  2. Collect memories via listMemories() across all basePaths (deduplicate by ID).
 *  3. Empty corpus → early return before isAvailable() check.
 *  4. Ollama unavailable → return FallbackListing with hint.
 *  5. Overview mode → loadMemoryContents, buildChunks, mapReduceSummarize.
 *  6. Per-type mode → loadMemoryContents, groupByType, per-type mapReduceSummarize.
 */
export async function summarize(request: SummarizeRequest): Promise<SummarizeResult> {
  const {
    basePaths,
    mode,
    typeFilter,
    digestId,
    tags,
    limit,
    timeoutMs,
    contextWindow,
  } = request;

  // Compute chunk budget from context window
  const chunkBudgetChars = contextWindow * CHARS_PER_TOKEN * CHUNK_BUDGET_RATIO;

  // -------------------------------------------------------------------------
  // Digest mode: bypass listing entirely
  // -------------------------------------------------------------------------
  if (mode === 'digest') {
    const available = await isAvailable();
    if (!available) {
      return { kind: 'empty', memoriesIncluded: [], hint: OLLAMA_UNAVAILABLE_HINT };
    }
    if (!digestId) {
      return { kind: 'empty', memoriesIncluded: [] };
    }
    // Try each basePath until the memory is found (H1 fix)
    let response;
    for (const bp of basePaths) {
      response = await readMemory({ id: digestId, basePath: bp });
      if (response.status === 'success' && response.memory) break;
    }
    if (!response || response.status === 'error' || !response.memory) {
      return { kind: 'empty', memoriesIncluded: [], hint: `Memory '${digestId}' not found in any scope` };
    }

    const content = truncateContent(response.memory.content, MAX_MEMORY_CONTENT_CHARS);

    const memContent: MemoryContent = {
      id: digestId,
      type: response.memory.frontmatter.type,
      title: response.memory.frontmatter.title,
      tags: response.memory.frontmatter.tags,
      content,
    };

    const prompt = buildPrompt([memContent], 'digest');
    const summary = await generate(prompt, undefined, timeoutMs);

    return {
      kind: 'digest',
      summary,
      memoriesIncluded: [digestId],
    };
  }

  // -------------------------------------------------------------------------
  // Collect memories across all basePaths — deduplicate by ID via Map
  // -------------------------------------------------------------------------
  const seenIds = new Map<string, MemoryLoadEntry>();

  const listResults = await Promise.all(
    basePaths.map(basePath => {
      const listRequest: ListMemoriesRequest = {
        basePath,
        tags: tags.length > 0 ? tags : undefined,
        limit: limit > 0 ? limit : undefined,
      };
      if (typeFilter) {
        listRequest.type = typeFilter;
      }
      return listMemories(listRequest);
    })
  );

  for (let i = 0; i < basePaths.length; i++) {
    const listResponse = listResults[i]!;
    if (listResponse.status === 'success' && listResponse.memories) {
      for (const mem of listResponse.memories) {
        if (!seenIds.has(mem.id)) {
          seenIds.set(mem.id, { summary: mem, basePath: basePaths[i]! });
        }
      }
    }
  }

  const allEntries = Array.from(seenIds.values());
  const allSummaries = allEntries.map(e => e.summary);

  // -------------------------------------------------------------------------
  // Empty corpus early return — before isAvailable() check
  // -------------------------------------------------------------------------
  if (allSummaries.length === 0) {
    return { kind: 'empty', memoriesIncluded: [] };
  }

  // -------------------------------------------------------------------------
  // Ollama availability check
  // -------------------------------------------------------------------------
  const available = await isAvailable();

  if (!available) {
    const listing = buildFallbackListing(allSummaries);
    return {
      kind: 'fallback',
      memories: listing,
      memoriesIncluded: allSummaries.map(s => s.id),
      hint: OLLAMA_UNAVAILABLE_HINT,
    };
  }

  // -------------------------------------------------------------------------
  // Overview mode
  // -------------------------------------------------------------------------
  if (mode === 'overview') {
    const contents = await loadMemoryContents(allEntries);

    if (contents.length === 0) {
      return { kind: 'empty', memoriesIncluded: [] };
    }

    const chunks = buildChunks(contents, chunkBudgetChars);
    const summary = await mapReduceSummarize(chunks, 'overview', undefined, timeoutMs);

    return {
      kind: 'overview',
      summary,
      memoriesIncluded: contents.map(c => c.id),
    };
  }

  // -------------------------------------------------------------------------
  // Per-type mode (default)
  // -------------------------------------------------------------------------
  const contents = await loadMemoryContents(allEntries);

  if (contents.length === 0) {
    return { kind: 'empty', memoriesIncluded: [] };
  }

  // Group by type
  const byType = new Map<string, MemoryContent[]>();
  for (const mem of contents) {
    const group = byType.get(mem.type) ?? [];
    group.push(mem);
    byType.set(mem.type, group);
  }

  // Summarise each type in parallel — each type is an independent LLM call.
  // TODO(post-MVP): add concurrency limit if type count grows large.
  const typeEntries = Array.from(byType.entries());
  const typeSummaries = await Promise.all(
    typeEntries.map(([type, typeContents]) => {
      const chunks = buildChunks(typeContents, chunkBudgetChars);
      return mapReduceSummarize(chunks, 'per-type', type, timeoutMs);
    })
  );
  const summaries: Record<string, string> = {};
  for (let i = 0; i < typeEntries.length; i++) {
    summaries[typeEntries[i]![0]] = typeSummaries[i]!;
  }

  return {
    kind: 'per-type',
    summaries,
    memoriesIncluded: contents.map(c => c.id),
  };
}
