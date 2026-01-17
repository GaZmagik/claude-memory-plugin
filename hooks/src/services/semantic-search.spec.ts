/**
 * Unit tests for semantic-search service
 *
 * Tests the semantic memory search functionality including
 * cosine similarity, embedding caching, and search operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  cosineSimilarity,
  loadEmbeddingCache,
  saveEmbeddingCache,
  isIndexStale,
  loadGraphLinks,
} from './semantic-search.js';

describe('Semantic Search Service', () => {
  const testCacheDir = '/tmp/semantic-search-test';

  beforeEach(() => {
    if (existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true });
    }
    mkdirSync(testCacheDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true });
    }
  });

  describe('cosineSimilarity', () => {
    it('should return 1.0 for identical vectors', () => {
      const a = [1, 2, 3, 4, 5];
      const b = [1, 2, 3, 4, 5];

      const similarity = cosineSimilarity(a, b);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should return 0.0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];

      const similarity = cosineSimilarity(a, b);

      expect(similarity).toBeCloseTo(0.0, 5);
    });

    it('should return -1.0 for opposite vectors', () => {
      const a = [1, 2, 3];
      const b = [-1, -2, -3];

      const similarity = cosineSimilarity(a, b);

      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it('should handle normalized vectors', () => {
      const a = [0.6, 0.8];
      const b = [0.8, 0.6];

      const similarity = cosineSimilarity(a, b);

      // cos(θ) = (0.6*0.8 + 0.8*0.6) / (1.0 * 1.0) = 0.96
      expect(similarity).toBeCloseTo(0.96, 5);
    });

    it('should return 0 for vectors of different lengths', () => {
      const a = [1, 2, 3];
      const b = [1, 2];

      const similarity = cosineSimilarity(a, b);

      expect(similarity).toBe(0);
    });

    it('should return 0 for empty vectors', () => {
      const a: number[] = [];
      const b: number[] = [];

      const similarity = cosineSimilarity(a, b);

      expect(similarity).toBe(0);
    });

    it('should return 0 when one vector is zero magnitude', () => {
      const a = [0, 0, 0];
      const b = [1, 2, 3];

      const similarity = cosineSimilarity(a, b);

      expect(similarity).toBe(0);
    });

    it('should handle high-dimensional vectors (like embeddings)', () => {
      // Simulate 768-dimension embeddings
      const a = Array(768).fill(0).map((_unused, i) => Math.sin(i / 100));
      const b = Array(768).fill(0).map((_unused, i) => Math.sin(i / 100 + 0.1));

      const similarity = cosineSimilarity(a, b);

      // Should be similar but not identical
      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThan(1.0);
    });

    it('should be commutative (a·b = b·a)', () => {
      const a = [3, 4, 5];
      const b = [1, 2, 3];

      const simAB = cosineSimilarity(a, b);
      const simBA = cosineSimilarity(b, a);

      expect(simAB).toBeCloseTo(simBA, 10);
    });

    it('should handle negative values', () => {
      const a = [-1, -2, -3];
      const b = [4, 5, 6];

      const similarity = cosineSimilarity(a, b);

      // Should be negative
      expect(similarity).toBeLessThan(0);
    });

    it('should handle mixed positive and negative values', () => {
      const a = [1, -1, 2, -2];
      const b = [2, 1, -1, -2];

      const similarity = cosineSimilarity(a, b);

      expect(similarity).toBeGreaterThan(-1);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle decimal precision correctly', () => {
      const a = [0.1, 0.2, 0.3];
      const b = [0.1, 0.2, 0.3];

      const similarity = cosineSimilarity(a, b);

      expect(similarity).toBeCloseTo(1.0, 10);
    });
  });

  describe('loadEmbeddingCache', () => {
    it('should return null when cache file does not exist', async () => {
      const embedding = await loadEmbeddingCache(testCacheDir, 'nonexistent-key');

      expect(embedding).toBeNull();
    });

    it('should load embedding from valid cache file', async () => {
      const cacheKey = 'test-embedding';
      const embeddingData = [1.0, 2.0, 3.0, 4.0];

      // Create cache file
      const cacheFile = join(testCacheDir, `${cacheKey}.json`);
      writeFileSync(cacheFile, JSON.stringify(embeddingData));

      const loaded = await loadEmbeddingCache(testCacheDir, cacheKey);

      expect(loaded).toEqual(embeddingData);
    });

    it('should return null for corrupted cache file', async () => {
      const cacheKey = 'corrupted';
      const cacheFile = join(testCacheDir, `${cacheKey}.json`);

      // Write invalid JSON
      writeFileSync(cacheFile, 'not valid json{]');

      const loaded = await loadEmbeddingCache(testCacheDir, cacheKey);

      expect(loaded).toBeNull();
    });

    it('should return null for empty array', async () => {
      const cacheKey = 'empty-array';
      const cacheFile = join(testCacheDir, `${cacheKey}.json`);

      writeFileSync(cacheFile, JSON.stringify([]));

      const loaded = await loadEmbeddingCache(testCacheDir, cacheKey);

      expect(loaded).toBeNull();
    });

    it('should return null for non-array data', async () => {
      const cacheKey = 'non-array';
      const cacheFile = join(testCacheDir, `${cacheKey}.json`);

      writeFileSync(cacheFile, JSON.stringify({ data: [1, 2, 3] }));

      const loaded = await loadEmbeddingCache(testCacheDir, cacheKey);

      expect(loaded).toBeNull();
    });

    it('should handle high-dimensional embeddings', async () => {
      const cacheKey = 'high-dim';
      const embeddingData = Array(768).fill(0).map((_unused, i) => i / 768);

      const cacheFile = join(testCacheDir, `${cacheKey}.json`);
      writeFileSync(cacheFile, JSON.stringify(embeddingData));

      const loaded = await loadEmbeddingCache(testCacheDir, cacheKey);

      expect(loaded).toEqual(embeddingData);
      expect(loaded?.length).toBe(768);
    });
  });

  describe('saveEmbeddingCache', () => {
    it('should save embedding to cache file', async () => {
      const cacheKey = 'test-save';
      const embedding = [1.5, 2.5, 3.5];

      await saveEmbeddingCache(testCacheDir, cacheKey, embedding);

      const cacheFile = join(testCacheDir, `${cacheKey}.json`);
      expect(existsSync(cacheFile)).toBe(true);

      const loaded = await loadEmbeddingCache(testCacheDir, cacheKey);
      expect(loaded).toEqual(embedding);
    });

    it('should create cache directory if it does not exist', async () => {
      const newCacheDir = join(testCacheDir, 'new-cache');
      const cacheKey = 'test-new-dir';
      const embedding = [1, 2, 3];

      await saveEmbeddingCache(newCacheDir, cacheKey, embedding);

      expect(existsSync(newCacheDir)).toBe(true);

      const loaded = await loadEmbeddingCache(newCacheDir, cacheKey);
      expect(loaded).toEqual(embedding);
    });

    it('should overwrite existing cache file', async () => {
      const cacheKey = 'overwrite-test';
      const embedding1 = [1, 2, 3];
      const embedding2 = [4, 5, 6];

      await saveEmbeddingCache(testCacheDir, cacheKey, embedding1);
      await saveEmbeddingCache(testCacheDir, cacheKey, embedding2);

      const loaded = await loadEmbeddingCache(testCacheDir, cacheKey);
      expect(loaded).toEqual(embedding2);
    });

    it('should handle write failures gracefully', async () => {
      const invalidDir = '/invalid/path/that/does/not/exist';
      const embedding = [1, 2, 3];

      // Should not throw - function catches errors internally
      await expect(saveEmbeddingCache(invalidDir, 'test', embedding)).resolves.toBeUndefined();
    });

    it('should save high-dimensional embeddings', async () => {
      const cacheKey = 'high-dim-save';
      const embedding = Array(768).fill(0).map(() => Math.random());

      await saveEmbeddingCache(testCacheDir, cacheKey, embedding);

      const loaded = await loadEmbeddingCache(testCacheDir, cacheKey);
      expect(loaded).toEqual(embedding);
    });
  });

  describe('isIndexStale', () => {
    const testProjectDir = join(testCacheDir, 'project');
    const indexDir = join(testProjectDir, '.claude', 'cache', 'semantic-index');
    const memoryDir = join(testProjectDir, '.claude', 'memory');

    beforeEach(() => {
      mkdirSync(indexDir, { recursive: true });
      mkdirSync(memoryDir, { recursive: true });
    });

    it('should return true when index file does not exist', async () => {
      const isStale = await isIndexStale(testProjectDir, 'local');

      expect(isStale).toBe(true);
    });

    it('should return false when index exists and no memory files exist', async () => {
      const indexFile = join(indexDir, 'local-index.json');
      writeFileSync(indexFile, JSON.stringify({ embeddings: [], memory_ids: [] }));

      rmSync(memoryDir, { recursive: true });

      const isStale = await isIndexStale(testProjectDir, 'local');

      expect(isStale).toBe(false);
    });

    it('should return false when all memories are older than index', async () => {
      // Create index file
      const indexFile = join(indexDir, 'local-index.json');
      writeFileSync(indexFile, JSON.stringify({ embeddings: [], memory_ids: [] }));

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      // Create older memory file (created before index)
      const memoryFile = join(memoryDir, 'learning-test.md');
      writeFileSync(memoryFile, '# Test Memory');

      // Manually set memory file to be older
      const indexStat = require('fs').statSync(indexFile);
      const olderTime = new Date(indexStat.mtimeMs - 1000);
      require('fs').utimesSync(memoryFile, olderTime, olderTime);

      const isStale = await isIndexStale(testProjectDir, 'local');

      expect(isStale).toBe(false);
    });

    it('should return true when any memory is newer than index', async () => {
      // Create index file
      const indexFile = join(indexDir, 'local-index.json');
      writeFileSync(indexFile, JSON.stringify({ embeddings: [], memory_ids: [] }));

      // Wait to ensure newer timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      // Create newer memory file
      const memoryFile = join(memoryDir, 'learning-new.md');
      writeFileSync(memoryFile, '# New Memory');

      const isStale = await isIndexStale(testProjectDir, 'local');

      expect(isStale).toBe(true);
    });

    it('should check only .md files in memory directory', async () => {
      const indexFile = join(indexDir, 'local-index.json');
      writeFileSync(indexFile, JSON.stringify({ embeddings: [], memory_ids: [] }));

      await new Promise(resolve => setTimeout(resolve, 10));

      // Create non-.md file
      const nonMdFile = join(memoryDir, 'index.json');
      writeFileSync(nonMdFile, '{}');

      const isStale = await isIndexStale(testProjectDir, 'local');

      // Should not consider non-.md files
      expect(isStale).toBe(false);
    });

    it('should handle nested memory directories', async () => {
      const indexFile = join(indexDir, 'local-index.json');
      writeFileSync(indexFile, JSON.stringify({ embeddings: [], memory_ids: [] }));

      await new Promise(resolve => setTimeout(resolve, 10));

      // Create memory in subdirectory
      const subDir = join(memoryDir, 'permanent');
      mkdirSync(subDir, { recursive: true });
      const memoryFile = join(subDir, 'learning-nested.md');
      writeFileSync(memoryFile, '# Nested Memory');

      const isStale = await isIndexStale(testProjectDir, 'local');

      expect(isStale).toBe(true);
    });
  });

  describe('loadGraphLinks', () => {
    const testProjectDir = join(testCacheDir, 'graph-project');
    const graphFile = join(testProjectDir, '.claude', 'memory', 'graph.json');

    beforeEach(() => {
      mkdirSync(join(testProjectDir, '.claude', 'memory'), { recursive: true });
    });

    it('should return empty array when graph file does not exist', async () => {
      const links = await loadGraphLinks(testProjectDir, 'some-memory-id');

      expect(links).toEqual([]);
    });

    it('should return links for a memory that exists', async () => {
      const graphData = {
        nodes: {
          'learning-test': {
            type: 'learning',
            links: ['gotcha-related', 'artifact-example'],
          },
        },
      };

      writeFileSync(graphFile, JSON.stringify(graphData));

      const links = await loadGraphLinks(testProjectDir, 'learning-test');

      expect(links).toEqual(['gotcha-related', 'artifact-example']);
    });

    it('should return empty array for memory with no links', async () => {
      const graphData = {
        nodes: {
          'learning-no-links': {
            type: 'learning',
          },
        },
      };

      writeFileSync(graphFile, JSON.stringify(graphData));

      const links = await loadGraphLinks(testProjectDir, 'learning-no-links');

      expect(links).toEqual([]);
    });

    it('should return empty array for non-existent memory', async () => {
      const graphData = {
        nodes: {
          'learning-exists': {
            type: 'learning',
            links: ['some-link'],
          },
        },
      };

      writeFileSync(graphFile, JSON.stringify(graphData));

      const links = await loadGraphLinks(testProjectDir, 'learning-does-not-exist');

      expect(links).toEqual([]);
    });

    it('should handle corrupted graph file', async () => {
      writeFileSync(graphFile, 'not valid json');

      const links = await loadGraphLinks(testProjectDir, 'any-id');

      expect(links).toEqual([]);
    });

    it('should handle graph file with missing nodes', async () => {
      const graphData = {
        // Missing nodes property
      };

      writeFileSync(graphFile, JSON.stringify(graphData));

      const links = await loadGraphLinks(testProjectDir, 'any-id');

      expect(links).toEqual([]);
    });

    it('should handle multiple memories in graph', async () => {
      const graphData = {
        nodes: {
          'learning-1': { type: 'learning', links: ['link-1'] },
          'learning-2': { type: 'learning', links: ['link-2', 'link-3'] },
          'gotcha-1': { type: 'gotcha', links: ['link-4'] },
        },
      };

      writeFileSync(graphFile, JSON.stringify(graphData));

      const links1 = await loadGraphLinks(testProjectDir, 'learning-1');
      const links2 = await loadGraphLinks(testProjectDir, 'learning-2');
      const links3 = await loadGraphLinks(testProjectDir, 'gotcha-1');

      expect(links1).toEqual(['link-1']);
      expect(links2).toEqual(['link-2', 'link-3']);
      expect(links3).toEqual(['link-4']);
    });
  });
});
