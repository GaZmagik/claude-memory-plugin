/**
 * T057: Unit tests for embedding generation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  generateEmbedding,
  loadEmbeddingCache,
  saveEmbeddingCache,
  getEmbeddingForMemory,
  batchGenerateEmbeddings,
  type EmbeddingCache,
  type EmbeddingProvider,
} from '../../../skills/memory/src/search/embedding.js';

describe('Embedding Generation', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'embedding-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('generateEmbedding', () => {
    it('should generate embedding vector for text', async () => {
      const text = 'This is a test memory about TypeScript';
      const mockProvider: EmbeddingProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]),
      };

      const embedding = await generateEmbedding(text, mockProvider);

      expect(embedding).toBeInstanceOf(Array);
      expect(embedding.length).toBeGreaterThan(0);
      expect(mockProvider.generate).toHaveBeenCalledWith(text);
    });

    it('should normalise embedding vectors to unit length', async () => {
      const text = 'Test text';
      const mockProvider: EmbeddingProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([3, 4]), // Length 5
      };

      const embedding = await generateEmbedding(text, mockProvider);

      // Check normalised to unit length (3/5, 4/5)
      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );
      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('should throw error on empty text', async () => {
      const mockProvider: EmbeddingProvider = {
        name: 'mock',
        generate: vi.fn(),
      };

      await expect(generateEmbedding('', mockProvider)).rejects.toThrow(
        'Text cannot be empty'
      );
    });

    it('should handle provider errors gracefully', async () => {
      const mockProvider: EmbeddingProvider = {
        name: 'mock',
        generate: vi.fn().mockRejectedValue(new Error('Provider unavailable')),
      };

      await expect(
        generateEmbedding('test', mockProvider)
      ).rejects.toThrow('Provider unavailable');
    });
  });

  describe('EmbeddingCache', () => {
    it('should load empty cache when file does not exist', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');

      const cache = await loadEmbeddingCache(cachePath);

      expect(cache).toEqual({ version: 1, entries: {} });
    });

    it('should load existing cache from file', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const existingCache: EmbeddingCache = {
        version: 1,
        entries: {
          'memory-1': {
            embedding: [0.1, 0.2, 0.3],
            hash: 'abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
        },
      };
      fs.writeFileSync(cachePath, JSON.stringify(existingCache));

      const cache = await loadEmbeddingCache(cachePath);

      expect(cache.entries['memory-1']).toBeDefined();
      expect(cache.entries['memory-1'].embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should save cache to file', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const cache: EmbeddingCache = {
        version: 1,
        entries: {
          'memory-2': {
            embedding: [0.4, 0.5, 0.6],
            hash: 'def456',
            timestamp: '2026-01-02T00:00:00Z',
          },
        },
      };

      await saveEmbeddingCache(cachePath, cache);

      const loaded = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      expect(loaded.entries['memory-2'].embedding).toEqual([0.4, 0.5, 0.6]);
    });

    it('should detect stale cache entries by content hash', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const staleCache: EmbeddingCache = {
        version: 1,
        entries: {
          'memory-1': {
            embedding: [0.1, 0.2, 0.3],
            hash: 'old-hash',
            timestamp: '2026-01-01T00:00:00Z',
          },
        },
      };
      fs.writeFileSync(cachePath, JSON.stringify(staleCache));

      const cache = await loadEmbeddingCache(cachePath);

      // Entry exists but hash doesn't match current content
      expect(cache.entries['memory-1'].hash).toBe('old-hash');
    });
  });

  describe('getEmbeddingForMemory', () => {
    it('should return cached embedding if hash matches', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const memoryId = 'decision-test';
      const content = 'Test memory content';
      const contentHash = 'matching-hash';

      const cache: EmbeddingCache = {
        version: 1,
        entries: {
          [memoryId]: {
            embedding: [0.7, 0.8, 0.9],
            hash: contentHash,
            timestamp: '2026-01-01T00:00:00Z',
          },
        },
      };
      fs.writeFileSync(cachePath, JSON.stringify(cache));

      const mockProvider: EmbeddingProvider = {
        name: 'mock',
        generate: vi.fn(),
      };

      const result = await getEmbeddingForMemory(
        memoryId,
        content,
        cachePath,
        mockProvider,
        contentHash
      );

      expect(result).toEqual([0.7, 0.8, 0.9]);
      expect(mockProvider.generate).not.toHaveBeenCalled();
    });

    it('should generate new embedding if hash differs', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const memoryId = 'decision-test';
      const content = 'Updated memory content';
      const newHash = 'new-hash';

      const cache: EmbeddingCache = {
        version: 1,
        entries: {
          [memoryId]: {
            embedding: [0.1, 0.2, 0.3],
            hash: 'old-hash',
            timestamp: '2026-01-01T00:00:00Z',
          },
        },
      };
      fs.writeFileSync(cachePath, JSON.stringify(cache));

      const mockProvider: EmbeddingProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5]),
      };

      const result = await getEmbeddingForMemory(
        memoryId,
        content,
        cachePath,
        mockProvider,
        newHash
      );

      expect(mockProvider.generate).toHaveBeenCalledWith(content);
      expect(result).toBeDefined();
    });

    it('should update cache after generating new embedding', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const memoryId = 'learning-new';
      const content = 'New learning content';
      const hash = 'content-hash';

      const mockProvider: EmbeddingProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([1, 0]),
      };

      await getEmbeddingForMemory(memoryId, content, cachePath, mockProvider, hash);

      const updatedCache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      expect(updatedCache.entries[memoryId]).toBeDefined();
      expect(updatedCache.entries[memoryId].hash).toBe(hash);
    });
  });

  describe('batchGenerateEmbeddings', () => {
    it('should generate embeddings for multiple memories', async () => {
      const memories = [
        { id: 'mem-1', content: 'First memory' },
        { id: 'mem-2', content: 'Second memory' },
        { id: 'mem-3', content: 'Third memory' },
      ];

      const mockProvider: EmbeddingProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5]),
      };

      const results = await batchGenerateEmbeddings(
        memories,
        testDir,
        mockProvider
      );

      expect(results).toHaveLength(3);
      expect(mockProvider.generate).toHaveBeenCalledTimes(3);
    });

    it('should skip already cached embeddings', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const cache: EmbeddingCache = {
        version: 1,
        entries: {
          'mem-1': {
            embedding: [0.1, 0.2],
            hash: 'hash-1',
            timestamp: '2026-01-01T00:00:00Z',
          },
        },
      };
      fs.writeFileSync(cachePath, JSON.stringify(cache));

      const memories = [
        { id: 'mem-1', content: 'First memory', hash: 'hash-1' },
        { id: 'mem-2', content: 'Second memory', hash: 'hash-2' },
      ];

      const mockProvider: EmbeddingProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5]),
      };

      await batchGenerateEmbeddings(memories, testDir, mockProvider);

      // Only mem-2 should generate new embedding
      expect(mockProvider.generate).toHaveBeenCalledTimes(1);
      expect(mockProvider.generate).toHaveBeenCalledWith('Second memory');
    });

    it('should report progress during batch generation', async () => {
      const memories = [
        { id: 'mem-1', content: 'First' },
        { id: 'mem-2', content: 'Second' },
      ];

      const mockProvider: EmbeddingProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5]),
      };

      const progressCalls: number[] = [];
      const onProgress = (current: number, total: number) => {
        progressCalls.push(current);
      };

      await batchGenerateEmbeddings(
        memories,
        testDir,
        mockProvider,
        onProgress
      );

      expect(progressCalls).toContain(1);
      expect(progressCalls).toContain(2);
    });
  });
});
