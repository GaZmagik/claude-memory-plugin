/**
 * Test T085A: Verify suggest-links includes external nodes (rules and reminders)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { indexExternalFiles } from '../external/external-file-indexer.js';
import { discoverExternalFiles } from '../external/external-file-discovery.js';
import type { MemoryGraph, MemoryIndex } from '../types/memory.js';

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
});
