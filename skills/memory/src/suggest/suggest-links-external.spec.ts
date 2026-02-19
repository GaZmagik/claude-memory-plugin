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
    const externalFiles = discoverExternalFiles({
      cwd: tempDir,
      homeDir: tempDir,
      gitRoot: tempDir,
      projectRoot: tempDir,
    });

    expect(externalFiles.length).toBeGreaterThan(0);

    const embeddingsPath = path.join(tempDir, 'embeddings.json');
    const mockProvider = {
      getEmbedding: async (_text: string) => [0.9, 0.1, 0.1],
    };

    await indexExternalFiles({
      basePath: tempDir,
      graph,
      index,
      embeddingsPath,
      externalFiles,
      embeddingProvider: mockProvider as any,
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
    // Create a regular memory
    const memoryDir = path.join(tempDir, '.claude', 'memory', 'permanent');
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(
      path.join(memoryDir, 'decision-tdd-approach.md'),
      '---\ntype: decision\ntitle: TDD Approach\ntags: [testing]\ncreated: 2026-02-19T10:00:00Z\nupdated: 2026-02-19T10:00:00Z\n---\n\nAlways write tests first using Test-Driven Development methodology'
    );

    // Create external rule file with similar content
    const claudePath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, '# Project Rules\nAlways use Test-Driven Development for all features');

    // Create graph and index
    await saveGraph(tempDir, {
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

    await saveIndex(tempDir, {
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
    const externalFiles = discoverExternalFiles({
      cwd: tempDir,
      homeDir: tempDir,
      gitRoot: tempDir,
      projectRoot: tempDir,
    });

    const embeddingsPath = path.join(tempDir, '.claude', 'memory', 'embeddings.json');

    // Normalized embedding for TDD-related content (magnitude ≈ 1.0)
    // [1, 0, 0, 0, 0] normalized = [1, 0, 0, 0, 0] (already unit length)
    const tddEmbedding = [1, 0, 0, 0, 0];

    // Mock embedding provider that returns the same normalized embedding for TDD content
    const mockProvider = {
      getEmbedding: async (text: string) => {
        // Return same embedding for TDD-related content (will be normalized by indexExternalFiles)
        if (text.includes('Test-Driven Development') || text.includes('TDD')) {
          return tddEmbedding; // Returns [1, 0, 0, 0, 0] which is already normalized
        }
        return [0, 1, 0, 0, 0]; // Different embedding for non-TDD content
      },
    };

    // Create initial embeddings for regular memory (already normalized)
    const initialCache = {
      version: 1,
      memories: {
        'decision-tdd-approach': {
          embedding: tddEmbedding,
          hash: 'abc123',
          timestamp: new Date().toISOString(),
        },
      },
    };
    fs.writeFileSync(embeddingsPath, JSON.stringify(initialCache, null, 2));

    // Load graph and index to pass to indexExternalFiles
    const { loadGraph } = await import('../graph/structure.js');
    const { loadIndex } = await import('../core/index.js');
    const loadedGraph = await loadGraph(tempDir);
    const loadedIndex = await loadIndex({ basePath: tempDir });

    // Index external files
    await indexExternalFiles({
      basePath: tempDir,
      graph: loadedGraph as any,
      index: loadedIndex,
      embeddingsPath,
      externalFiles,
      embeddingProvider: mockProvider as any,
    });

    // Save the updated graph and index
    await saveGraph(tempDir, loadedGraph as any);
    await saveIndex(tempDir, loadedIndex);

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
      basePath: tempDir,
      threshold: 0.7,
      limit: 10,
      autoLink: false,
    });

    expect(result.status).toBe('success');

    // Debug output if no suggestions
    if (result.suggestions.length === 0) {
      console.log('Graph nodes:', loadedGraph.nodes.map(n => ({ id: n.id, title: n.title })));
      console.log('Embeddings:', Object.keys(finalCache.memories));
      console.log('Result:', result);
    }

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
