/**
 * Test T085A: Verify suggest-links includes external nodes (rules and reminders)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { indexExternalFiles } from '../external/external-file-indexer.js';
import { discoverExternalFiles } from '../external/external-file-discovery.js';
import { suggestLinks } from './suggest-links.js';
import { saveGraph } from '../graph/structure.js';
import { saveIndex } from '../core/index.js';
import type { MemoryGraph, MemoryIndex } from '../types/memory.js';
import { MemoryType, Scope } from '../types/enums.js';
import type { EmbeddingProvider } from '../search/embedding.js';

describe('Suggest Links - External Node Integration', () => {
  let tempDir: string;
  let graph: MemoryGraph;
  let index: MemoryIndex;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suggest-links-external-test-'));

    graph = {
      version: 1,
      nodes: [],
      edges: [],
    };

    index = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      memories: [],
    };
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // T085A: Test that suggest-links loads external node embeddings from cache
  it('should load external node embeddings alongside regular memories', async () => {
    // Create external rule file
    const claudePath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, '# Project Rules\nAlways use Test-Driven Development');

    // Create external reminder file
    const agentMemoryDir = path.join(tempDir, '.claude', 'agent-memory', 'curator');
    fs.mkdirSync(agentMemoryDir, { recursive: true });
    fs.writeFileSync(path.join(agentMemoryDir, 'MEMORY.md'), '# Curator Memory\nGraph integrity patterns');

    // Discover and index external files
    const externalFiles = await discoverExternalFiles({
      cwd: tempDir,
      homeDir: tempDir,
      gitRoot: tempDir,
      projectRoot: tempDir,
    });

    expect(externalFiles.length).toBeGreaterThan(0);

    const embeddingsPath = path.join(tempDir, 'embeddings.json');
    const mockProvider: EmbeddingProvider = {
      name: 'test-mock',
      generate: async (_text: string) => [0.9, 0.1, 0.1],
    };

    await indexExternalFiles({
      basePath: tempDir,
      graph,
      index,
      embeddingsPath,
      externalFiles,
      embeddingProvider: mockProvider,
    });

    // Verify embeddings cache contains external nodes
    const { loadEmbeddingCache } = await import('../search/embedding.js');
    const cache = await loadEmbeddingCache(embeddingsPath);

    expect(cache.memories).toBeDefined();
    expect(Object.keys(cache.memories).length).toBeGreaterThan(0);

    // Find rule and reminder node IDs in cache
    const ruleNodeId = externalFiles.find(f => f.kind === 'claude-instructions')?.id;
    const reminderNodeId = externalFiles.find(f => f.kind === 'agent-memory-summary')?.id;

    expect(ruleNodeId).toBeDefined();
    expect(reminderNodeId).toBeDefined();

    // Verify both external nodes have embeddings in cache
    expect(cache.memories[ruleNodeId!]).toBeDefined();
    expect(cache.memories[ruleNodeId!]!.embedding).toBeDefined();
    expect(cache.memories[reminderNodeId!]).toBeDefined();
    expect(cache.memories[reminderNodeId!]!.embedding).toBeDefined();

    // Verify embeddings are not skipped by thought- filter
    expect(ruleNodeId!.startsWith('thought-')).toBe(false);
    expect(reminderNodeId!.startsWith('thought-')).toBe(false);
  });

  // T085A: Test that suggestLinks() actually includes external nodes in suggestions
  it('should include rule and reminder nodes in suggest-links results', async () => {
    // Define basePath following the pattern from other tests
    const basePath = path.join(tempDir, '.claude', 'memory');

    // Create a regular memory
    const memoryDir = path.join(basePath, 'permanent');
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(
      path.join(memoryDir, 'decision-tdd-approach.md'),
      '---\ntype: decision\ntitle: TDD Approach\ntags: [testing]\ncreated: 2026-02-19T10:00:00Z\nupdated: 2026-02-19T10:00:00Z\n---\n\nAlways write tests first using Test-Driven Development methodology'
    );

    // Create external rule file with similar content
    const claudePath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, '# Project Rules\nAlways use Test-Driven Development for all features');

    // Create graph and index
    await saveGraph(basePath, {
      version: 1,
      nodes: [
        {
          id: 'decision-tdd-approach' as any,
          type: MemoryType.Decision,
          title: 'TDD Approach',
        },
      ],
      edges: [],
    } as any);

    await saveIndex(basePath, {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      memories: [
        {
          id: 'decision-tdd-approach' as any,
          type: MemoryType.Decision,
          title: 'TDD Approach',
          tags: ['testing'],
          created: '2026-02-19T10:00:00Z',
          updated: '2026-02-19T10:00:00Z',
          scope: Scope.Project,
          relativePath: 'permanent/decision-tdd-approach.md',
        },
      ],
    });

    // Discover and index external files
    const externalFiles = await discoverExternalFiles({
      cwd: tempDir,
      homeDir: tempDir,
      gitRoot: tempDir,
      projectRoot: tempDir,
    });

    const embeddingsPath = path.join(basePath, 'embeddings.json');

    // C3: Use realistic mock embeddings with similarity patterns and noise
    // Base embedding for TDD-related content (similar but not identical)
    const mockProvider: EmbeddingProvider = {
      name: 'realistic-mock',
      generate: async (text: string) => {
        // Base embeddings with realistic similarity patterns
        const baseEmbedding = (text.includes('Test-Driven Development') ||
                               text.includes('TDD') ||
                               text.includes('CLAUDE.md'))
          ? [0.9, 0.1, 0.05, 0.02, 0.01]  // Similar but not identical for TDD content
          : [0.1, 0.9, 0.05, 0.02, 0.01]; // Different pattern for non-TDD content

        // Add realistic noise to prevent exact matches (±2.5% variation)
        return baseEmbedding.map(v => {
          const noise = (Math.random() * 0.05) - 0.025; // ±2.5% variation
          return Math.max(0, Math.min(1, v + noise)); // Clamp to [0, 1]
        });
      },
    };

    // Create initial embeddings for regular memory with realistic similarity
    // C3: Use realistic embedding similar to TDD content (not identical)
    const initialCache = {
      version: 1,
      memories: {
        'decision-tdd-approach': {
          embedding: [0.88, 0.12, 0.06, 0.03, 0.015], // Similar to mock TDD pattern but with variation
          hash: 'abc123',
          timestamp: new Date().toISOString(),
        },
      },
    };
    fs.writeFileSync(embeddingsPath, JSON.stringify(initialCache, null, 2));

    // Load graph and index to pass to indexExternalFiles
    const { loadGraph } = await import('../graph/structure.js');
    const { loadIndex } = await import('../core/index.js');
    const loadedGraph = await loadGraph(basePath);
    const loadedIndex = await loadIndex({ basePath });

    // Index external files
    await indexExternalFiles({
      basePath,
      graph: loadedGraph as any,
      index: loadedIndex,
      embeddingsPath,
      externalFiles,
      embeddingProvider: mockProvider as any,
    });

    // Save the updated graph and index
    await saveGraph(basePath, loadedGraph as any);
    await saveIndex(basePath, loadedIndex);

    // Debug: verify external files were discovered and indexed
    expect(externalFiles.length).toBeGreaterThan(0);
    expect(loadedGraph.nodes.length).toBeGreaterThan(1); // Should have both decision and rule nodes
    expect(loadedIndex.memories.length).toBeGreaterThan(1);

    // Debug: verify embeddings cache has both memories
    const { loadEmbeddingCache } = await import('../search/embedding.js');
    const finalCache = await loadEmbeddingCache(embeddingsPath);
    expect(Object.keys(finalCache.memories).length).toBeGreaterThan(1);

    // Now call suggestLinks and verify external nodes appear in suggestions
    const result = await suggestLinks({
      basePath,
      threshold: 0.7,
      limit: 10,
      autoLink: false,
    });

    expect(result.status).toBe('success');
    expect(result.suggestions.length).toBeGreaterThan(0);

    // Find the rule node in suggestions
    const ruleNodeId = externalFiles.find(f => f.kind === 'claude-instructions')?.id;
    expect(ruleNodeId).toBeDefined();

    // Verify the rule node appears in suggestions
    const suggestionWithRule = result.suggestions.find(
      s => s.source === ruleNodeId || s.target === ruleNodeId
    );

    expect(suggestionWithRule).toBeDefined();
    expect(suggestionWithRule!.similarity).toBeGreaterThan(0.7);
  });
});
