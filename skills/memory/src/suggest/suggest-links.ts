/**
 * Suggest Links - Find potential relationships using embeddings
 *
 * Uses semantic similarity to suggest links between memories
 * that might be related but aren't yet connected.
 */

import * as path from 'node:path';
import * as os from 'node:os';
import { loadEmbeddingCache } from '../search/embedding.js';
import { findPotentialDuplicates } from '../search/similarity.js';
import { loadIndex } from '../core/index.js';
import { loadGraph, hasNode } from '../graph/structure.js';
import { linkMemories, storeCrossScopeEdge } from '../graph/link.js';
import { generate, isAvailable } from '../services/ollama.js';
import { unsafeAsMemoryId } from '../types/branded.js';

import { getScopePath } from '../scope/resolver.js';
import { Scope } from '../types/enums.js';

/**
 * Metadata for a memory loaded during multi-scope suggest-links
 */
interface MemoryMetadata {
  basePath: string;
  scope: Scope;
  agent?: string;
}

/**
 * Derive scope type from a target path by comparing it to known scope paths.
 * Uses prefix-based matching so that crafted paths containing '/.claude/agents/'
 * as a substring cannot spoof agent-project classification (CWE-706).
 */
export function deriveScope(targetPath: string, projectBase: string, globalBase: string): Scope {
  const normalizedTarget = path.resolve(targetPath);
  const normalizedProject = path.resolve(projectBase);
  const normalizedGlobal = path.resolve(globalBase);

  const agentsInProject = path.join(normalizedProject, 'agents');
  const agentsInGlobal = path.join(normalizedGlobal, 'agents');

  if (normalizedTarget === normalizedGlobal) {
    return Scope.Global;
  } else if (normalizedTarget === normalizedProject) {
    return Scope.Project;
  } else if (
    normalizedTarget === agentsInProject ||
    normalizedTarget.startsWith(agentsInProject + path.sep)
  ) {
    return Scope.AgentProject;
  } else if (
    normalizedTarget === agentsInGlobal ||
    normalizedTarget.startsWith(agentsInGlobal + path.sep)
  ) {
    return Scope.AgentGlobal;
  } else {
    return Scope.Local;
  }
}

/**
 * Suggested link
 */
export interface SuggestedLink {
  source: string;
  target: string;
  similarity: number;
  sourceTitle: string;
  targetTitle: string;
  reason: string;
  /** Whether this suggestion crosses scope boundaries (v1.4.0+) */
  isCrossScope?: boolean;
  /** Source memory metadata (v1.4.0+) */
  sourceMetadata?: MemoryMetadata;
  /** Target memory metadata (v1.4.0+) */
  targetMetadata?: MemoryMetadata;
}

/**
 * Suggest links request
 */
export interface SuggestLinksRequest {
  basePath: string;
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  /** Maximum suggestions to return */
  limit?: number;
  /** Automatically create suggested links */
  autoLink?: boolean;
  /** Include ALL scopes (project, global, all agents) - v1.4.0+ */
  allScopes?: boolean;
  /** Agent name (for multi-scope loading) */
  agentName?: string;
  /** Scope string for agent scoping */
  scopeStr?: string;
  /** Invoke LLM to verify relation type on auto-linked same-scope edges (requires Ollama) */
  llmType?: boolean;
  /** Force update existing edge metadata (smart bypass: only updates if metadata differs) */
  force?: boolean;
}

/**
 * Suggest links response
 */
export interface SuggestLinksResponse {
  status: 'success' | 'error';
  /** Suggested links */
  suggestions: SuggestedLink[];
  /** Links auto-created (if autoLink=true) */
  created: number;
  /** Same-scope links created (v1.4.0+) */
  createdSameScope?: number;
  /** Cross-scope links created (v1.4.0+) */
  createdCrossScope?: number;
  /** Skipped (already linked) */
  skipped: number;
  /** Total pairs analysed */
  analysed: number;
  error?: string;
}

/**
 * Sanitise a memory title before interpolating it into an LLM prompt.
 * Strips quotes and control characters, truncates to 100 chars (CWE-77).
 */
export function sanitiseTitleForPrompt(title: string): string {
  return title
    .replace(/['"`]/g, '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .slice(0, 100)
    .trim();
}

/** Pattern for a safe relation label: lowercase alphanumeric + hyphens, 1–64 chars. */
export const VALID_LABEL_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$/;

/**
 * Validate and normalise an LLM-generated relation label.
 * Returns undefined if the response does not conform to a safe label format.
 */
export function validateLlmLabel(response: string): string | undefined {
  const cleaned = response.trim().toLowerCase().replace(/\s+/g, '-').replace(/-{2,}/g, '-');
  return VALID_LABEL_RE.test(cleaned) ? cleaned : undefined;
}

/**
 * Suggest potential links between memories
 */
export async function suggestLinks(
  request: SuggestLinksRequest
): Promise<SuggestLinksResponse> {
  const { basePath, threshold = 0.75, limit = 20, autoLink = false, allScopes = false, agentName, llmType = false, force = false } = request;

  // Capture cwd once — scope resolution must be consistent within a single call (CWE-362)
  const cwd = process.cwd();
  const globalPath = path.join(os.homedir(), '.claude', 'memory');

  // Validate basePath is within the expected memory hierarchy (M2 / CWE-22)
  const resolvedBasePath = path.resolve(basePath);
  const projectMemoryRoot = path.join(cwd, '.claude', 'memory');
  const withinGlobal =
    resolvedBasePath === globalPath ||
    resolvedBasePath.startsWith(globalPath + path.sep);
  const withinProject =
    resolvedBasePath === projectMemoryRoot ||
    resolvedBasePath.startsWith(projectMemoryRoot + path.sep);
  if (!withinGlobal && !withinProject) {
    return {
      status: 'error',
      suggestions: [],
      created: 0,
      skipped: 0,
      analysed: 0,
      error: 'Invalid basePath: path must be within the memory directory hierarchy',
    };
  }

  const suggestions: SuggestedLink[] = [];
  let created = 0;
  let createdSameScope = 0;
  let createdCrossScope = 0;
  let skipped = 0;
  let analysed = 0;

  // Load embeddings cache(s)
  const embeddings: Record<string, number[]> = {};
  const indexMap = new Map<string, any>();
  const metadataMap = new Map<string, MemoryMetadata>();
  let graph = await loadGraph(basePath);
  const existingLinks = new Set<string>();

  // Load primary (agent or project) embeddings
  const cachePath = path.join(basePath, 'embeddings.json');
  let cache;
  try {
    cache = await loadEmbeddingCache(cachePath);
  } catch {
    return {
      status: 'error',
      suggestions: [],
      created: 0,
      skipped: 0,
      analysed: 0,
      error: 'No embeddings cache found. Run semantic search to generate embeddings.',
    };
  }

  // Check cache has memories
  if (!cache.memories || Object.keys(cache.memories).length === 0) {
    return {
      status: 'success',
      suggestions: [],
      created: 0,
      skipped: 0,
      analysed: 0,
    };
  }

  // Load index for primary basePath
  const index = await loadIndex({ basePath });
  for (const entry of index.memories) {
    indexMap.set(entry.id, entry);
  }

  // Determine primary scope type
  const primaryScope = agentName ? Scope.AgentProject : deriveScope(basePath, await getScopePath(Scope.Project, cwd, ''), globalPath);

  // Build embeddings map from primary scope (excluding thoughts)
  // AND track metadata for each memory
  for (const [id, entry] of Object.entries(cache.memories)) {
    if (id.startsWith('thought-')) continue; // Skip temporary
    embeddings[id] = entry.embedding;

    // Track metadata for primary scope memories
    metadataMap.set(id, {
      basePath,
      scope: primaryScope,
      agent: agentName,
    });
  }

  // Build set of existing links from primary graph
  for (const edge of graph.edges) {
    existingLinks.add(`${edge.source}:${edge.target}`);
    existingLinks.add(`${edge.target}:${edge.source}`); // Bidirectional check
  }

  // When --all-scopes, load embeddings from ALL scopes (project, global, all agents)
  if (allScopes) {
    try {
      const projectPath = getScopePath(Scope.Project, cwd, '');
      const scopePaths = new Set<string>([projectPath, globalPath]);

      // Scan for all agent scopes
      const agentsPath = path.join(projectPath, 'agents');
      try {
        const agentDirs = await Bun.file(agentsPath).exists()
          ? await Array.fromAsync(
              (async function* () {
                for await (const entry of new Bun.Glob('*').scan(agentsPath)) {
                  const agentMemoryPath = path.join(agentsPath, entry);
                  if (await Bun.file(path.join(agentMemoryPath, 'index.json')).exists()) {
                    yield agentMemoryPath;
                  }
                }
              })()
            )
          : [];
        agentDirs.forEach(p => scopePaths.add(p));
      } catch (err) {
        process.stderr.write(`[suggest-links] Agent directory scanning failed, continuing with project + global: ${err instanceof Error ? err.message : String(err)}\n`);
      }

      // Load embeddings from all scopes
      for (const scopePath of scopePaths) {
        if (scopePath === basePath) continue; // Already loaded

        const scopeCachePath = path.join(scopePath, 'embeddings.json');
        let scopeCache;
        try {
          scopeCache = await loadEmbeddingCache(scopeCachePath);
        } catch {
          continue;
        }

        const scopeType = deriveScope(scopePath, projectPath, globalPath);

        for (const [id, entry] of Object.entries(scopeCache.memories)) {
          if (id.startsWith('thought-')) continue;
          if (!embeddings[id]) {
            embeddings[id] = entry.embedding;
            metadataMap.set(id, {
              basePath: scopePath,
              scope: scopeType,
              agent: (scopeType === Scope.AgentProject || scopeType === Scope.AgentGlobal) ? path.basename(scopePath) : undefined,
            });
          }
        }

        const scopeIndex = await loadIndex({ basePath: scopePath });
        for (const entry of scopeIndex.memories) {
          if (!indexMap.has(entry.id)) {
            indexMap.set(entry.id, entry);
          }
        }

        const scopeGraph = await loadGraph(scopePath);
        for (const edge of scopeGraph.edges) {
          existingLinks.add(`${edge.source}:${edge.target}`);
          existingLinks.add(`${edge.target}:${edge.source}`);
        }
      }
    } catch (err) {
      process.stderr.write(`[suggest-links] All-scopes loading failed, continuing with primary scope: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }
  // Filter out temporary memories (thoughts)
  const memoryIds = Object.keys(embeddings).filter(id => !id.startsWith('thought-'));
  if (memoryIds.length < 2) {
    return {
      status: 'success',
      suggestions: [],
      created: 0,
      skipped: 0,
      analysed: 0,
    };
  }

  // Find similar pairs using LSH-accelerated search (O(n*k) for large collections
  // instead of O(n^2) brute force). findPotentialDuplicates automatically selects
  // between brute-force (for N < 200) and LSH (for N >= 200), returns deduplicated
  // pairs sorted by similarity descending, and uses triangular iteration to avoid
  // redundant A-B / B-A comparisons.
  const candidatePairs = findPotentialDuplicates(
    embeddings,
    threshold,
    undefined, // No internal limit — we filter below and need full candidate set
    { numHashBits: 12, numTables: 8 } // Tuned for link suggestion recall at 0.75 threshold
  );

  for (const pair of candidatePairs) {
    analysed++;

    // Check if already linked (bidirectional check already in existingLinks)
    if (existingLinks.has(`${pair.id1}:${pair.id2}`)) {
      skipped++;
      continue;
    }

    // For --all-scopes, we allow cross-scope suggestions
    // For single-scope, check if both are in the graph
    if (!allScopes) {
      if (!hasNode(graph, pair.id1) || !hasNode(graph, pair.id2)) {
        continue;
      }
    }

    const sourceEntry = indexMap.get(unsafeAsMemoryId(pair.id1));
    const targetEntry = indexMap.get(unsafeAsMemoryId(pair.id2));

    if (!sourceEntry || !targetEntry) continue;

    // Get metadata for both memories to detect cross-scope
    const sourceMeta = metadataMap.get(pair.id1);
    const targetMeta = metadataMap.get(pair.id2);
    const isCrossScope = sourceMeta && targetMeta && sourceMeta.basePath !== targetMeta.basePath;

    suggestions.push({
      source: pair.id1,
      target: pair.id2,
      similarity: pair.similarity,
      sourceTitle: sourceEntry.title,
      targetTitle: targetEntry.title,
      reason: `Semantic similarity: ${(pair.similarity * 100).toFixed(1)}%`,
      isCrossScope,
      sourceMetadata: sourceMeta,
      targetMetadata: targetMeta,
    });

    // Mark as seen to avoid duplicates
    existingLinks.add(`${pair.id1}:${pair.id2}`);

    // Stop if we have enough
    if (suggestions.length >= limit) break;
  }

  // Sort by similarity (highest first)
  suggestions.sort((a, b) => b.similarity - a.similarity);

  // Trim to limit
  const finalSuggestions = suggestions.slice(0, limit);

  // Auto-link if requested
  // v1.4.0+: Now supports cross-scope auto-linking using storeCrossScopeEdge()
  if (autoLink && finalSuggestions.length > 0) {
    for (const suggestion of finalSuggestions) {
      try {
        // LLM type verification applies to both same-scope and cross-scope links
        let verifiedRelation: string | undefined;
        if (llmType) {
          const available = await isAvailable();
          if (available) {
            const safeSource = sanitiseTitleForPrompt(suggestion.sourceTitle);
            const safeTarget = sanitiseTitleForPrompt(suggestion.targetTitle);
            const prompt = `Given source memory [${safeSource}] and target memory [${safeTarget}], what is the best relation label for their link? Reply with a single short label only, using lowercase letters, digits, and hyphens.`;
            const llmResult = await generate(prompt, undefined, 300_000);
            verifiedRelation = validateLlmLabel(llmResult);
          } else {
            process.stderr.write('[Ollama] Unavailable — skipping LLM type verification\n');
          }
        }

        if (suggestion.isCrossScope && suggestion.sourceMetadata && suggestion.targetMetadata) {
          // Cross-scope link: use storeCrossScopeEdge()
          await storeCrossScopeEdge({
            sourceId: suggestion.source,
            targetId: suggestion.target,
            relation: verifiedRelation ?? 'auto-linked-by-similarity',
            sourceBasePath: suggestion.sourceMetadata.basePath,
            targetBasePath: suggestion.targetMetadata.basePath,
            sourceScope: suggestion.sourceMetadata.scope,
            targetScope: suggestion.targetMetadata.scope,
            sourceAgent: suggestion.sourceMetadata.agent,
            targetAgent: suggestion.targetMetadata.agent,
          });
          createdCrossScope++;
        } else {
          // Same-scope link: use linkMemories()
          await linkMemories({
            source: suggestion.source,
            target: suggestion.target,
            relation: 'auto-linked-by-similarity',
            basePath,
            agent: agentName,
            similarity: suggestion.similarity,
            verifiedRelation,
            force,
          });
          createdSameScope++;
        }
        created++;
      } catch (err) {
        process.stderr.write(`[suggest-links] Auto-link failed for ${suggestion.source}→${suggestion.target}: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    }
  }

  return {
    status: 'success',
    suggestions: finalSuggestions,
    created,
    createdSameScope: createdSameScope > 0 ? createdSameScope : undefined,
    createdCrossScope: createdCrossScope > 0 ? createdCrossScope : undefined,
    skipped,
    analysed,
  };
}
