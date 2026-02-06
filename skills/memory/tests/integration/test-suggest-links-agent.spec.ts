/**
 * Integration Tests for Suggest-Links with Agent Scope (Phase E - T112)
 *
 * Tests link suggestion functionality within agent-scoped memories.
 * Uses fake embedding vectors to control cosine similarity outcomes.
 *
 * Key implementation facts:
 * - suggestLinks reads embeddings.json from basePath
 * - Uses cosine similarity via findSimilarMemories
 * - Requires memories to exist in both index.json AND graph.json
 * - Response shape: { status, suggestions: SuggestedLink[], created, skipped, analysed }
 * - SuggestedLink shape: { source, target, similarity, sourceTitle, targetTitle, reason }
 * - Filters out thought-* IDs from suggestions
 * - Skips pairs already linked in graph edges
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cmdSuggestLinks } from '../../src/cli/commands/suggest.js';
import { writeMemory } from '../../src/core/write.js';
import { linkMemories } from '../../src/graph/link.js';
import { Scope, MemoryType } from '../../src/types/enums.js';
import type { EmbeddingCache } from '../../src/search/embedding.js';
import type { ParsedArgs } from '../../src/cli/parser.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Create a normalised embedding vector of given dimension.
 * Uses a seed value to generate deterministic vectors.
 * Two vectors with similar seeds will have high cosine similarity.
 */
function makeEmbedding(seed: number, dimension: number = 8): number[] {
  const vec: number[] = [];
  for (let i = 0; i < dimension; i++) {
    // Simple deterministic function — seed controls direction
    vec.push(Math.sin(seed + i * 0.7) * Math.cos(seed * 0.3 + i));
  }
  // Normalise to unit length
  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return vec.map(v => v / mag);
}

/**
 * Create an EmbeddingCache with entries for given memory IDs.
 * IDs sharing the same seed group will have high cosine similarity.
 */
function createEmbeddingCache(
  entries: Array<{ id: string; seed: number }>
): EmbeddingCache {
  const memories: EmbeddingCache['memories'] = {};
  for (const entry of entries) {
    memories[entry.id] = {
      embedding: makeEmbedding(entry.seed),
      hash: `hash-${entry.id}`,
      timestamp: new Date().toISOString(),
    };
  }
  return { version: 1, memories };
}

describe('Suggest-links with agent scope', () => {
  let testDir: string;
  let agentBasePath: string;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suggest-agent-test-'));
    process.chdir(testDir);
    fs.mkdirSync('.git');

    // Create agent memories with writeMemory (populates index.json + graph.json + files)
    await writeMemory({
      id: 'learning-ts-generics',
      type: MemoryType.Learning,
      title: 'TypeScript Generics',
      content: 'Advanced generics patterns with constraints and conditional types',
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      projectRoot: testDir,
      tags: ['typescript', 'generics'],
    });

    await writeMemory({
      id: 'decision-ts-types',
      type: MemoryType.Decision,
      title: 'Type System Design',
      content: 'Use strict mode and generic constraints for type safety',
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      projectRoot: testDir,
      tags: ['typescript', 'types'],
    });

    await writeMemory({
      id: 'artifact-ts-patterns',
      type: MemoryType.Artifact,
      title: 'Generic Utility Types',
      content: 'Reusable generic patterns and utility types',
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      projectRoot: testDir,
      tags: ['typescript', 'patterns'],
    });

    await writeMemory({
      id: 'learning-react-hooks',
      type: MemoryType.Learning,
      title: 'React Hooks',
      content: 'useState and useEffect patterns for component state management',
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      projectRoot: testDir,
      tags: ['react', 'hooks'],
    });

    // Agent basePath for embeddings
    agentBasePath = path.join(testDir, '.claude', 'memory', 'agents', 'typescript-pro');

    // Write embeddings cache with controlled similarity:
    // - ts-generics, ts-types, ts-patterns use similar seeds (high similarity)
    // - react-hooks uses a different seed (low similarity)
    const cache = createEmbeddingCache([
      { id: 'learning-ts-generics', seed: 1.0 },
      { id: 'decision-ts-types', seed: 1.1 },    // Very similar to generics
      { id: 'artifact-ts-patterns', seed: 1.2 },  // Similar to generics
      { id: 'learning-react-hooks', seed: 50.0 },  // Very different
    ]);
    fs.writeFileSync(
      path.join(agentBasePath, 'embeddings.json'),
      JSON.stringify(cache, null, 2),
    );
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ─── T112: Agent scope routing (TDD red — cmdSuggestLinks doesn't support --agent yet) ───

  it('routes to agent basePath when --agent flag provided', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdSuggestLinks(args);

    expect(result.status).toBe('success');
    const data = result.data as any;
    // Should find suggestions from agent-scoped memories
    expect(data.suggestions).toBeDefined();
    expect(data.suggestions.length).toBeGreaterThan(0);
  });

  it('returns suggestions with correct shape', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;

    if (data.suggestions.length > 0) {
      const suggestion = data.suggestions[0];
      expect(suggestion).toHaveProperty('source');
      expect(suggestion).toHaveProperty('target');
      expect(suggestion).toHaveProperty('similarity');
      expect(suggestion).toHaveProperty('sourceTitle');
      expect(suggestion).toHaveProperty('targetTitle');
      expect(suggestion).toHaveProperty('reason');
      expect(typeof suggestion.similarity).toBe('number');
      expect(suggestion.reason).toContain('Semantic similarity');
    }
  });

  it('suggests links between semantically similar agent memories', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', threshold: '0.5' },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;
    const suggestions = data.suggestions as Array<{
      source: string;
      target: string;
      similarity: number;
    }>;

    // The three TS-related memories (seeds 1.0, 1.1, 1.2) should be suggested
    const tsRelated = suggestions.filter(
      s =>
        (s.source.includes('ts-generics') ||
          s.source.includes('ts-types') ||
          s.source.includes('ts-patterns')) &&
        (s.target.includes('ts-generics') ||
          s.target.includes('ts-types') ||
          s.target.includes('ts-patterns')),
    );
    expect(tsRelated.length).toBeGreaterThan(0);
  });

  it('sorts suggestions by similarity descending', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', threshold: '0.3' },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;
    const suggestions = data.suggestions as Array<{ similarity: number }>;

    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1]!.similarity).toBeGreaterThanOrEqual(
        suggestions[i]!.similarity,
      );
    }
  });

  it('respects threshold parameter', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', threshold: '0.9' },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;
    const suggestions = data.suggestions as Array<{ similarity: number }>;

    // All returned suggestions should be above threshold
    for (const s of suggestions) {
      expect(s.similarity).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('respects limit parameter', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', limit: '2', threshold: '0.3' },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;

    expect(data.suggestions.length).toBeLessThanOrEqual(2);
  });

  it('excludes already-linked pairs from suggestions', async () => {
    // Link two memories before running suggest-links
    await linkMemories({
      source: 'learning-ts-generics',
      target: 'decision-ts-types',
      relation: 'references',
      basePath: agentBasePath,
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', threshold: '0.3' },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;
    const suggestions = data.suggestions as Array<{
      source: string;
      target: string;
    }>;

    // Should NOT suggest the already-linked pair
    const hasLinkedPair = suggestions.some(
      s =>
        (s.source === 'learning-ts-generics' && s.target === 'decision-ts-types') ||
        (s.source === 'decision-ts-types' && s.target === 'learning-ts-generics'),
    );
    expect(hasLinkedPair).toBe(false);

    // But skipped count should be > 0
    expect(data.skipped).toBeGreaterThan(0);
  });

  it('reports analysed count', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', threshold: '0.3' },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;

    expect(typeof data.analysed).toBe('number');
    expect(data.analysed).toBeGreaterThan(0);
  });

  it('auto-links suggestions when --auto-link flag used', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', 'auto-link': true, threshold: '0.5' },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;

    // If there were suggestions, some should have been created
    if (data.suggestions.length > 0) {
      expect(data.created).toBeGreaterThan(0);
    }
  });

  // ─── Edge cases ───

  it('handles agent with no embeddings cache', async () => {
    // Create a different agent with no embeddings
    await writeMemory({
      id: 'learning-isolated-mem',
      type: MemoryType.Learning,
      title: 'Isolated Memory',
      content: 'No embeddings for this agent',
      scope: Scope.AgentProject,
      agent: 'isolated-agent',
      projectRoot: testDir,
      tags: ['isolated'],
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'isolated-agent' },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;

    // Should handle gracefully — either error about no cache or empty suggestions
    // The current implementation returns error when no embeddings.json exists
    expect(result.status).toBe('success');
    if (data.error) {
      expect(data.error).toContain('embeddings');
    } else {
      expect(data.suggestions).toHaveLength(0);
    }
  });

  it('handles agent with single memory (not enough for pairs)', async () => {
    await writeMemory({
      id: 'learning-lonely-mem',
      type: MemoryType.Learning,
      title: 'Lonely Memory',
      content: 'Only memory in this agent',
      scope: Scope.AgentProject,
      agent: 'lonely-agent',
      projectRoot: testDir,
      tags: ['lonely'],
    });

    const lonelyBasePath = path.join(
      testDir, '.claude', 'memory', 'agents', 'lonely-agent',
    );

    // Write embeddings with single entry
    const cache = createEmbeddingCache([
      { id: 'learning-lonely-mem', seed: 42 },
    ]);
    fs.writeFileSync(
      path.join(lonelyBasePath, 'embeddings.json'),
      JSON.stringify(cache, null, 2),
    );

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'lonely-agent' },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;

    expect(result.status).toBe('success');
    expect(data.suggestions).toHaveLength(0);
  });

  it('filters out thought- prefixed memories from suggestions', async () => {
    // Write a thought memory
    await writeMemory({
      id: 'thought-tmp-deliberation',
      type: MemoryType.Learning,
      title: 'Temporary Thought',
      content: 'Advanced generics thinking — similar to ts-generics on purpose',
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      projectRoot: testDir,
      tags: ['thought'],
    });

    // Add embedding for the thought (with similar seed to ts-generics)
    const cachePath = path.join(agentBasePath, 'embeddings.json');
    const existingCache = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as EmbeddingCache;
    existingCache.memories['thought-tmp-deliberation'] = {
      embedding: makeEmbedding(1.05),
      hash: 'hash-thought',
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(cachePath, JSON.stringify(existingCache, null, 2));

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', threshold: '0.3' },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;
    const suggestions = data.suggestions as Array<{
      source: string;
      target: string;
    }>;

    // No suggestion should involve the thought memory
    const hasThought = suggestions.some(
      s => s.source.startsWith('thought-') || s.target.startsWith('thought-'),
    );
    expect(hasThought).toBe(false);
  });

  // ─── T112/T126: --include-shared (TDD red — not implemented yet) ───

  it('does not suggest links to shared memories without --include-shared', async () => {
    // Create project-level memory with embeddings
    const projectBasePath = path.join(testDir, '.claude', 'memory');
    await writeMemory({
      id: 'artifact-project-types',
      type: MemoryType.Artifact,
      title: 'Shared Type Definitions',
      content: 'Shared type definitions for TypeScript generics',
      scope: Scope.Project,
      basePath: projectBasePath,
      tags: ['typescript', 'types'],
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', threshold: '0.3' },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;
    const suggestions = data.suggestions as Array<{
      source: string;
      target: string;
    }>;

    // Should NOT include project memory in agent-only suggestions
    const hasProjectLink = suggestions.some(
      s => s.source === 'artifact-project-types' || s.target === 'artifact-project-types',
    );
    expect(hasProjectLink).toBe(false);
  });

  it('includes shared memories when --include-shared flag used', async () => {
    // Create project-level memory
    const projectBasePath = path.join(testDir, '.claude', 'memory');
    await writeMemory({
      id: 'artifact-project-types',
      type: MemoryType.Artifact,
      title: 'Shared Type Definitions',
      content: 'Shared type definitions for TypeScript generics',
      scope: Scope.Project,
      basePath: projectBasePath,
      tags: ['typescript', 'types'],
    });

    // Write project-level embeddings with similar seed to agent memories
    const projectEmbCache = createEmbeddingCache([
      { id: 'artifact-project-types', seed: 1.15 },
    ]);
    fs.writeFileSync(
      path.join(projectBasePath, 'embeddings.json'),
      JSON.stringify(projectEmbCache, null, 2),
    );

    const args: ParsedArgs = {
      positional: [],
      flags: {
        agent: 'typescript-pro',
        'include-shared': true,
        threshold: '0.3',
      },
    };

    const result = await cmdSuggestLinks(args);
    const data = result.data as any;
    const suggestions = data.suggestions as Array<{
      source: string;
      target: string;
    }>;

    // Should include project memory in cross-scope suggestions
    const hasProjectLink = suggestions.some(
      s => s.source === 'artifact-project-types' || s.target === 'artifact-project-types',
    );
    expect(hasProjectLink).toBe(true);
  });

  it('validates --include-shared requires --agent', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { 'include-shared': true }, // Missing --agent
    };

    const result = await cmdSuggestLinks(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('--agent');
  });
});
