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
  createMockProvider,
  createOllamaProvider,
  generateContentHash,
  type EmbeddingCache,
  type EmbeddingProvider,
} from './embedding.js';

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

      expect(cache).toEqual({ version: 1, memories: {} });
    });

    it('should load existing cache from file', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const existingCache: EmbeddingCache = {
        version: 1,
        memories: {
          'memory-1': {
            embedding: [0.1, 0.2, 0.3],
            hash: 'abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
        },
      };
      fs.writeFileSync(cachePath, JSON.stringify(existingCache));

      const cache = await loadEmbeddingCache(cachePath);

      expect(cache.memories['memory-1']).toBeDefined();
      expect(cache.memories['memory-1'].embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should save cache to file', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const cache: EmbeddingCache = {
        version: 1,
        memories: {
          'memory-2': {
            embedding: [0.4, 0.5, 0.6],
            hash: 'def456',
            timestamp: '2026-01-02T00:00:00Z',
          },
        },
      };

      await saveEmbeddingCache(cachePath, cache);

      const loaded = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      expect(loaded.memories['memory-2'].embedding).toEqual([0.4, 0.5, 0.6]);
    });

    it('should detect stale cache entries by content hash', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const staleCache: EmbeddingCache = {
        version: 1,
        memories: {
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
      expect(cache.memories['memory-1'].hash).toBe('old-hash');
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
        memories: {
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
        memories: {
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
      expect(updatedCache.memories[memoryId]).toBeDefined();
      expect(updatedCache.memories[memoryId].hash).toBe(hash);
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
        memories: {
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

  describe('loadEmbeddingCache error handling', () => {
    it('should return empty cache on corrupted JSON file', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      fs.writeFileSync(cachePath, '{ invalid json content }');

      const cache = await loadEmbeddingCache(cachePath);

      expect(cache).toEqual({ version: 1, memories: {} });
    });
  });

  describe('saveEmbeddingCache directory creation', () => {
    it('should create parent directory if it does not exist', async () => {
      const nestedPath = path.join(testDir, 'nested', 'dir', 'embeddings.json');
      const cache: EmbeddingCache = { version: 1, memories: {} };

      await saveEmbeddingCache(nestedPath, cache);

      expect(fs.existsSync(nestedPath)).toBe(true);
    });
  });

  describe('saveEmbeddingCache error handling', () => {
    it('should throw on ENOSPC (disk full) error', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const cache: EmbeddingCache = { version: 1, memories: {} };

      // Mock writeFileSync to throw ENOSPC error
      const enospcError = new Error('ENOSPC: no space left on device');
      (enospcError as NodeJS.ErrnoException).code = 'ENOSPC';
      const spy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw enospcError;
      });

      try {
        await expect(saveEmbeddingCache(cachePath, cache)).rejects.toThrow('ENOSPC');
      } finally {
        spy.mockRestore();
      }
    });

    it('should throw on EACCES (permission denied) error', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const cache: EmbeddingCache = { version: 1, memories: {} };

      // Mock writeFileSync to throw EACCES error
      const eaccesError = new Error('EACCES: permission denied');
      (eaccesError as NodeJS.ErrnoException).code = 'EACCES';
      const spy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw eaccesError;
      });

      try {
        await expect(saveEmbeddingCache(cachePath, cache)).rejects.toThrow('EACCES');
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('getEmbeddingForMemory cache write failure', () => {
    it('should reject with error when cache write fails with EACCES', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const memoryId = 'learning-test';
      const content = 'Test content';
      const hash = 'test-hash';

      const mockProvider: EmbeddingProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5]),
      };

      // Mock writeFileSync to throw EACCES error after generation
      const eaccesError = new Error('EACCES: permission denied');
      (eaccesError as NodeJS.ErrnoException).code = 'EACCES';
      const spy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw eaccesError;
      });

      try {
        // Should reject because cache write fails
        await expect(
          getEmbeddingForMemory(memoryId, content, cachePath, mockProvider, hash)
        ).rejects.toThrow('EACCES');
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('generateContentHash', () => {
    it('should generate consistent hash for same content', () => {
      const hash1 = generateContentHash('test content');
      const hash2 = generateContentHash('test content');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different content', () => {
      const hash1 = generateContentHash('content A');
      const hash2 = generateContentHash('content B');

      expect(hash1).not.toBe(hash2);
    });

    it('should return 16-character hash', () => {
      const hash = generateContentHash('any content');

      expect(hash).toHaveLength(16);
    });
  });

  describe('createMockProvider', () => {
    it('should create a mock provider with default dimension', () => {
      const provider = createMockProvider();

      expect(provider.name).toBe('mock');
      expect(typeof provider.generate).toBe('function');
    });

    it('should generate embeddings of specified dimension', async () => {
      const provider = createMockProvider(128);
      const embedding = await provider.generate('test text');

      expect(embedding).toHaveLength(128);
    });

    it('should generate deterministic embeddings for same text', async () => {
      const provider = createMockProvider(64);
      const embedding1 = await provider.generate('same text');
      const embedding2 = await provider.generate('same text');

      expect(embedding1).toEqual(embedding2);
    });

    it('should generate different embeddings for different text', async () => {
      const provider = createMockProvider(64);
      const embedding1 = await provider.generate('text one');
      const embedding2 = await provider.generate('text two');

      expect(embedding1).not.toEqual(embedding2);
    });
  });

  describe('createOllamaProvider', () => {
    it('should create provider with default model and URL', () => {
      const provider = createOllamaProvider();

      expect(provider.name).toBe('ollama:embeddinggemma');
    });

    it('should create provider with custom model', () => {
      const provider = createOllamaProvider('nomic-embed-text');

      expect(provider.name).toBe('ollama:nomic-embed-text');
    });

    it('should create provider with custom base URL', () => {
      const provider = createOllamaProvider('custom-model', 'http://custom:1234');

      expect(provider.name).toBe('ollama:custom-model');
    });

    it('should call Ollama API on generate', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: [0.1, 0.2, 0.3] }),
      });
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      try {
        const provider = createOllamaProvider('test-model', 'http://localhost:11434');
        const embedding = await provider.generate('test text');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:11434/api/embeddings',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
        expect(embedding).toEqual([0.1, 0.2, 0.3]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should throw on Ollama API error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      try {
        const provider = createOllamaProvider();
        await expect(provider.generate('test')).rejects.toThrow('Ollama API error');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
