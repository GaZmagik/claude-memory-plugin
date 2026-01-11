/**
 * Integration Test: Embedding Provider Failures
 *
 * Tests graceful degradation when embedding providers fail:
 * - Ollama service unavailable
 * - Network errors and timeouts
 * - Invalid responses
 * - Rate limiting
 * - Fallback to alternative providers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateEmbedding,
  getEmbeddingForMemory,
  batchGenerateEmbeddings,
  createMockProvider,
  type EmbeddingProvider,
} from '../../skills/memory/src/search/embedding.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

describe('Embedding Provider Failures', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'memory-embedding-fail-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Service Unavailable', () => {
    it('should handle provider that throws connection error', async () => {
      const failingProvider: EmbeddingProvider = {
        name: 'failing-ollama',
        generate: async () => {
          throw new Error('ECONNREFUSED: Connection refused');
        },
      };

      await expect(
        generateEmbedding('test content', failingProvider)
      ).rejects.toThrow();
    });

    it('should handle network timeout', async () => {
      const timeoutProvider: EmbeddingProvider = {
        name: 'timeout-provider',
        generate: async () => {
          await new Promise((_, reject) =>
            setTimeout(() => reject(new Error('ETIMEDOUT')), 100)
          );
          return [];
        },
      };

      await expect(
        generateEmbedding('test content', timeoutProvider)
      ).rejects.toThrow('ETIMEDOUT');
    });

    it('should handle DNS resolution failure', async () => {
      const dnsFailProvider: EmbeddingProvider = {
        name: 'dns-fail',
        generate: async () => {
          throw new Error('ENOTFOUND: DNS lookup failed');
        },
      };

      await expect(
        generateEmbedding('test content', dnsFailProvider)
      ).rejects.toThrow('ENOTFOUND');
    });
  });

  describe('Invalid Responses', () => {
    it('should handle empty embedding response', async () => {
      const emptyProvider: EmbeddingProvider = {
        name: 'empty-response',
        generate: async () => {
          return [];
        },
      };

      const result = await generateEmbedding('test content', emptyProvider);
      expect(result).toEqual([]);
    });

    it('should handle non-numeric values in embedding', async () => {
      const invalidProvider: EmbeddingProvider = {
        name: 'invalid-numbers',
        generate: async () => {
          return [1, 2, NaN, 4, 5] as number[];
        },
      };

      const result = await generateEmbedding('test content', invalidProvider);
      expect(result).toBeDefined();
      // System should handle NaN gracefully
    });

    it('should handle infinity in embeddings', async () => {
      const infinityProvider: EmbeddingProvider = {
        name: 'infinity-provider',
        generate: async () => {
          return [1, 2, Infinity, -Infinity, 5];
        },
      };

      const result = await generateEmbedding('test content', infinityProvider);
      expect(result).toBeDefined();
    });

    it('should handle wrong dimension size', async () => {
      const wrongDimProvider: EmbeddingProvider = {
        name: 'wrong-dim',
        generate: async (text: string) => {
          // Return random dimension each time
          return Array(Math.floor(Math.random() * 100) + 1).fill(0.5);
        },
      };

      const result1 = await generateEmbedding('text 1', wrongDimProvider);
      const result2 = await generateEmbedding('text 2', wrongDimProvider);

      // Dimensions might not match
      expect(result1.length).toBeGreaterThan(0);
      expect(result2.length).toBeGreaterThan(0);
    });
  });

  describe('HTTP Error Responses', () => {
    it('should handle 404 not found', async () => {
      const notFoundProvider: EmbeddingProvider = {
        name: 'not-found',
        generate: async () => {
          const error: any = new Error('Not Found');
          error.status = 404;
          throw error;
        },
      };

      await expect(
        generateEmbedding('test content', notFoundProvider)
      ).rejects.toThrow();
    });

    it('should handle 500 server error', async () => {
      const serverErrorProvider: EmbeddingProvider = {
        name: 'server-error',
        generate: async () => {
          const error: any = new Error('Internal Server Error');
          error.status = 500;
          throw error;
        },
      };

      await expect(
        generateEmbedding('test content', serverErrorProvider)
      ).rejects.toThrow();
    });

    it('should handle 429 rate limiting', async () => {
      const rateLimitProvider: EmbeddingProvider = {
        name: 'rate-limited',
        generate: async () => {
          const error: any = new Error('Too Many Requests');
          error.status = 429;
          error.retryAfter = 60;
          throw error;
        },
      };

      await expect(
        generateEmbedding('test content', rateLimitProvider)
      ).rejects.toThrow('Too Many Requests');
    });

    it('should handle 503 service unavailable', async () => {
      const unavailableProvider: EmbeddingProvider = {
        name: 'unavailable',
        generate: async () => {
          const error: any = new Error('Service Unavailable');
          error.status = 503;
          throw error;
        },
      };

      await expect(
        generateEmbedding('test content', unavailableProvider)
      ).rejects.toThrow();
    });
  });

  describe('Partial Failures in Batch Operations', () => {
    it('should handle intermittent failures during batch processing', async () => {
      let callCount = 0;
      const flakeyProvider: EmbeddingProvider = {
        name: 'flakey',
        generate: async (text: string) => {
          callCount++;
          // Fail every 3rd call
          if (callCount % 3 === 0) {
            throw new Error('Intermittent failure');
          }
          return createMockProvider().generate(text);
        },
      };

      const memories = [
        { id: 'mem-1', content: 'Content 1' },
        { id: 'mem-2', content: 'Content 2' },
        { id: 'mem-3', content: 'Content 3' },
        { id: 'mem-4', content: 'Content 4' },
      ];

      // Batch operation should fail on the 3rd item
      await expect(
        batchGenerateEmbeddings(memories, testDir, flakeyProvider)
      ).rejects.toThrow('Intermittent failure');
    });

    it('should use cache to avoid re-generating failed embeddings', async () => {
      const mockProvider = createMockProvider();

      // First batch succeeds
      const memories1 = [
        { id: 'mem-1', content: 'Content 1' },
        { id: 'mem-2', content: 'Content 2' },
      ];

      const results1 = await batchGenerateEmbeddings(memories1, testDir, mockProvider);
      expect(results1).toHaveLength(2);
      expect(results1.every(r => !r.fromCache)).toBe(true);

      // Create failing provider for new embeddings
      let callCount = 0;
      const selectiveFailProvider: EmbeddingProvider = {
        name: 'selective-fail',
        generate: async (text: string) => {
          callCount++;
          // Always fail for new content
          if (text.includes('Content 3')) {
            throw new Error('Failed for new content');
          }
          return mockProvider.generate(text);
        },
      };

      // Second batch includes cached + new
      const memories2 = [
        { id: 'mem-1', content: 'Content 1' }, // Cached
        { id: 'mem-3', content: 'Content 3' }, // Will fail
      ];

      // Should fail on mem-3, but mem-1 would have been from cache
      await expect(
        batchGenerateEmbeddings(memories2, testDir, selectiveFailProvider)
      ).rejects.toThrow('Failed for new content');
    });
  });

  describe('Input Validation Failures', () => {
    it('should reject empty text', async () => {
      const provider = createMockProvider();

      await expect(
        generateEmbedding('', provider)
      ).rejects.toThrow('Text cannot be empty');
    });

    it('should reject whitespace-only text', async () => {
      const provider = createMockProvider();

      await expect(
        generateEmbedding('   \n\t  ', provider)
      ).rejects.toThrow('Text cannot be empty');
    });

    it('should handle extremely long text', async () => {
      const provider = createMockProvider();
      const longText = 'a'.repeat(1000000); // 1MB of text

      const result = await generateEmbedding(longText, provider);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle unicode and special characters', async () => {
      const provider = createMockProvider();
      const unicodeText = '🎉 Hello 世界 مرحبا 🚀';

      const result = await generateEmbedding(unicodeText, provider);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Cache Corruption Handling', () => {
    it('should recover from corrupted cache file', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const provider = createMockProvider();

      // Create valid cache first
      await getEmbeddingForMemory('mem-1', 'Content 1', cachePath, provider);

      // Corrupt the cache
      fs.writeFileSync(cachePath, 'corrupted json{{{');

      // Should handle gracefully and regenerate
      const result = await getEmbeddingForMemory('mem-1', 'Content 1', cachePath, provider);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle missing cache directory', async () => {
      const cachePath = path.join(testDir, 'nonexistent', 'embeddings.json');
      const provider = createMockProvider();

      // Should create directory and cache file
      const result = await getEmbeddingForMemory('mem-1', 'Content 1', cachePath, provider);
      expect(result).toBeDefined();
      expect(fs.existsSync(path.dirname(cachePath))).toBe(true);
    });

    it('should handle read-only cache file', async () => {
      const cachePath = path.join(testDir, 'embeddings.json');
      const provider = createMockProvider();

      // Create cache
      await getEmbeddingForMemory('mem-1', 'Content 1', cachePath, provider);

      // Make read-only
      fs.chmodSync(cachePath, 0o444);

      try {
        // Should still read from cache (cached embedding)
        const result = await getEmbeddingForMemory('mem-1', 'Content 1', cachePath, provider);
        expect(result).toBeDefined();

        // New embedding will fail because cache can't be written
        // Implementation throws EACCES when saveEmbeddingCache fails
        await expect(
          getEmbeddingForMemory('mem-2', 'Content 2', cachePath, provider)
        ).rejects.toThrow('EACCES');
      } finally {
        // Restore permissions
        fs.chmodSync(cachePath, 0o644);
      }
    });
  });

  describe('Provider Fallback Strategies', () => {
    it('should allow trying alternative provider on failure', async () => {
      const failingProvider: EmbeddingProvider = {
        name: 'primary-failed',
        generate: async () => {
          throw new Error('Primary provider unavailable');
        },
      };

      const fallbackProvider = createMockProvider();

      // Primary fails
      let error: Error | null = null;
      try {
        await generateEmbedding('test content', failingProvider);
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();

      // Fallback succeeds
      const result = await generateEmbedding('test content', fallbackProvider);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Performance Degradation', () => {
    it('should handle slow provider gracefully', async () => {
      const slowProvider: EmbeddingProvider = {
        name: 'slow',
        generate: async (text: string) => {
          // Simulate slow response (500ms)
          await new Promise(resolve => setTimeout(resolve, 500));
          return createMockProvider().generate(text);
        },
      };

      const startTime = Date.now();
      const result = await generateEmbedding('test content', slowProvider);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeGreaterThan(500);
      expect(duration).toBeLessThan(2000); // Should still complete
    });

    it('should handle batch processing with slow provider', async () => {
      const slowProvider: EmbeddingProvider = {
        name: 'slow-batch',
        generate: async (text: string) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return createMockProvider().generate(text);
        },
      };

      const memories = [
        { id: 'mem-1', content: 'Content 1' },
        { id: 'mem-2', content: 'Content 2' },
        { id: 'mem-3', content: 'Content 3' },
      ];

      const startTime = Date.now();
      const results = await batchGenerateEmbeddings(memories, testDir, slowProvider);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(duration).toBeGreaterThan(300); // At least 100ms per item
    });
  });

  describe('Normalisation Edge Cases', () => {
    it('should handle zero-magnitude vectors', async () => {
      const zeroProvider: EmbeddingProvider = {
        name: 'zero-vector',
        generate: async () => {
          return [0, 0, 0, 0, 0];
        },
      };

      const result = await generateEmbedding('test content', zeroProvider);
      expect(result).toEqual([0, 0, 0, 0, 0]);
    });

    it('should normalise very large values', async () => {
      const largeProvider: EmbeddingProvider = {
        name: 'large-values',
        generate: async () => {
          return [1e10, 1e10, 1e10];
        },
      };

      const result = await generateEmbedding('test content', largeProvider);
      expect(result).toBeDefined();

      // Check normalisation worked
      const magnitude = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('should handle very small values', async () => {
      const smallProvider: EmbeddingProvider = {
        name: 'small-values',
        generate: async () => {
          return [1e-10, 1e-10, 1e-10];
        },
      };

      const result = await generateEmbedding('test content', smallProvider);
      expect(result).toBeDefined();

      const magnitude = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1.0, 5);
    });
  });
});
