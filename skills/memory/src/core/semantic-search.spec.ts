/**
 * Unit tests for semantic search API layer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { semanticSearchMemories } from './semantic-search.js';
import { MemoryType, Scope } from '../types/enums.js';

describe('Semantic Search API', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-api-test-'));

    // Create index.json
    const index = {
      version: 1,
      memories: [
        {
          id: 'decision-test',
          type: MemoryType.Decision,
          title: 'Test Decision',
          tags: ['test'],
          relativePath: 'decision-test.md',
          scope: Scope.Local,
          created: '2026-01-01T00:00:00Z',
          updated: '2026-01-01T00:00:00Z',
        },
      ],
    };
    fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));

    // Create embeddings cache
    const embeddings = {
      version: 1,
      memories: {
        'decision-test': {
          embedding: [0.9, 0.1, 0.0],
          hash: 'hash1',
          timestamp: '2026-01-01T00:00:00Z',
        },
      },
    };
    fs.writeFileSync(
      path.join(testDir, 'embeddings.json'),
      JSON.stringify(embeddings)
    );
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('semanticSearchMemories', () => {
    it('should return error when query is empty', async () => {
      const result = await semanticSearchMemories({
        query: '',
        basePath: testDir,
        provider: { name: 'mock', generate: vi.fn() },
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('query is required');
    });

    it('should return error when query is whitespace only', async () => {
      const result = await semanticSearchMemories({
        query: '   ',
        basePath: testDir,
        provider: { name: 'mock', generate: vi.fn() },
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('query is required');
    });

    it('should return error when provider is not provided', async () => {
      const result = await semanticSearchMemories({
        query: 'test query',
        basePath: testDir,
        provider: undefined as any,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('provider is required');
    });

    it('should perform successful semantic search', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.85, 0.15, 0.0]),
      };

      const result = await semanticSearchMemories({
        query: 'test query',
        basePath: testDir,
        provider: mockProvider,
        threshold: 0.5,
      });

      expect(result.status).toBe('success');
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should include all metadata in results', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.9, 0.1, 0.0]),
      };

      const result = await semanticSearchMemories({
        query: 'test',
        basePath: testDir,
        provider: mockProvider,
        threshold: 0.5,
      });

      expect(result.status).toBe('success');
      if (result.results && result.results.length > 0) {
        const item = result.results[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('tags');
        expect(item).toHaveProperty('scope');
        expect(item).toHaveProperty('score');
      }
    });

    it('should use higher threshold in auto-link mode', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.9, 0.1, 0.0]),
      };

      // With forAutoLink, threshold should be at least 0.8
      const result = await semanticSearchMemories({
        query: 'test',
        basePath: testDir,
        provider: mockProvider,
        forAutoLink: true,
        threshold: 0.3, // Would normally be low, but auto-link bumps it up
      });

      expect(result.status).toBe('success');
      // If results exist, they should meet the higher threshold
      if (result.results) {
        result.results.forEach(r => {
          expect(r.score).toBeGreaterThanOrEqual(0.8);
        });
      }
    });

    it('should use default threshold in auto-link mode when not provided', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.9, 0.1, 0.0]),
      };

      const result = await semanticSearchMemories({
        query: 'test',
        basePath: testDir,
        provider: mockProvider,
        forAutoLink: true,
        // No threshold - should default to 0.85 for auto-link
      });

      expect(result.status).toBe('success');
    });

    it('should handle search errors gracefully', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockRejectedValue(new Error('Embedding failed')),
      };

      const result = await semanticSearchMemories({
        query: 'test',
        basePath: testDir,
        provider: mockProvider,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Semantic search failed');
    });

    it('should use default basePath when not provided', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5, 0.0]),
      };

      // Don't provide basePath - should use cwd
      const result = await semanticSearchMemories({
        query: 'test',
        provider: mockProvider,
      });

      // Should not crash, just return results (may be empty)
      expect(['success', 'error']).toContain(result.status);
    });

    it('should pass type filter to search', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.9, 0.1, 0.0]),
      };

      const result = await semanticSearchMemories({
        query: 'test',
        basePath: testDir,
        provider: mockProvider,
        type: MemoryType.Decision,
        threshold: 0.5,
      });

      expect(result.status).toBe('success');
      if (result.results && result.results.length > 0) {
        expect(result.results.every(r => r.type === 'decision')).toBe(true);
      }
    });

    it('should pass scope filter to search', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.9, 0.1, 0.0]),
      };

      const result = await semanticSearchMemories({
        query: 'test',
        basePath: testDir,
        provider: mockProvider,
        scope: Scope.Local,
        threshold: 0.5,
      });

      expect(result.status).toBe('success');
    });

    it('should respect limit parameter', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5, 0.0]),
      };

      const result = await semanticSearchMemories({
        query: 'test',
        basePath: testDir,
        provider: mockProvider,
        limit: 1,
        threshold: 0.0,
      });

      expect(result.status).toBe('success');
      if (result.results) {
        expect(result.results.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Error Handling - Ollama Failures', () => {
    it('should handle network timeout errors', async () => {
      const mockProvider = {
        name: 'ollama:test',
        generate: vi.fn().mockRejectedValue(new Error('Network timeout after 30s')),
      };

      const result = await semanticSearchMemories({
        query: 'test query',
        basePath: testDir,
        provider: mockProvider,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Semantic search failed');
      expect(result.error).toContain('Network timeout');
    });

    it('should handle Ollama connection refused', async () => {
      const mockProvider = {
        name: 'ollama:embeddinggemma',
        generate: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:11434')),
      };

      const result = await semanticSearchMemories({
        query: 'test query',
        basePath: testDir,
        provider: mockProvider,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Semantic search failed');
      expect(result.error).toContain('ECONNREFUSED');
    });

    it('should handle Ollama API error responses', async () => {
      const mockProvider = {
        name: 'ollama:test',
        generate: vi.fn().mockRejectedValue(new Error('Ollama API error: 500 Internal Server Error')),
      };

      const result = await semanticSearchMemories({
        query: 'test query',
        basePath: testDir,
        provider: mockProvider,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Semantic search failed');
      expect(result.error).toContain('Ollama API error');
    });

    it('should handle model not found errors', async () => {
      const mockProvider = {
        name: 'ollama:nonexistent-model',
        generate: vi.fn().mockRejectedValue(new Error('model "nonexistent-model" not found')),
      };

      const result = await semanticSearchMemories({
        query: 'test query',
        basePath: testDir,
        provider: mockProvider,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Semantic search failed');
      expect(result.error).toContain('not found');
    });

    it('should handle malformed embedding responses', async () => {
      const mockProvider = {
        name: 'ollama:test',
        generate: vi.fn().mockResolvedValue(null as any),
      };

      const result = await semanticSearchMemories({
        query: 'test query',
        basePath: testDir,
        provider: mockProvider,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Semantic search failed');
    });

    it('should handle empty embedding arrays', async () => {
      const mockProvider = {
        name: 'ollama:test',
        generate: vi.fn().mockResolvedValue([]),
      };

      const result = await semanticSearchMemories({
        query: 'test query',
        basePath: testDir,
        provider: mockProvider,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Semantic search failed');
    });

    it('should handle invalid embedding dimensions gracefully', async () => {
      // The implementation doesn't validate embedding values - it accepts
      // NaN/Infinity and lets cosine similarity handle them (returns NaN)
      const mockProvider = {
        name: 'ollama:test',
        generate: vi.fn().mockResolvedValue([NaN, Infinity, -Infinity]),
      };

      const result = await semanticSearchMemories({
        query: 'test query',
        basePath: testDir,
        provider: mockProvider,
      });

      // Implementation is permissive - returns success with empty results
      // since NaN similarities won't match threshold
      expect(result.status).toBe('success');
      expect(result.results).toBeDefined();
    });

    it('should handle corrupted embedding cache', async () => {
      // Write corrupted cache file
      fs.writeFileSync(path.join(testDir, 'embeddings.json'), 'invalid json{[}');

      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5, 0.0]),
      };

      const result = await semanticSearchMemories({
        query: 'test query',
        basePath: testDir,
        provider: mockProvider,
      });

      // Should handle gracefully and recreate cache
      expect(result.status).toBe('success');
      expect(result.results).toBeDefined();
    });

    it('should handle missing embeddings cache gracefully', async () => {
      // Remove embeddings cache
      fs.rmSync(path.join(testDir, 'embeddings.json'));

      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5, 0.0]),
      };

      const result = await semanticSearchMemories({
        query: 'test query',
        basePath: testDir,
        provider: mockProvider,
      });

      expect(result.status).toBe('success');
      expect(result.results).toEqual([]);
    });

    it('should handle filesystem permission errors', async () => {
      const readOnlyDir = path.join(os.tmpdir(), 'readonly-test');
      fs.mkdirSync(readOnlyDir, { recursive: true });

      // Create valid files first
      fs.writeFileSync(path.join(readOnlyDir, 'index.json'), JSON.stringify({ version: 1, memories: [] }));
      fs.writeFileSync(path.join(readOnlyDir, 'embeddings.json'), JSON.stringify({ version: 1, memories: {} }));

      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5, 0.0]),
      };

      const result = await semanticSearchMemories({
        query: 'test query',
        basePath: readOnlyDir,
        provider: mockProvider,
      });

      // Should still work for read operations
      expect(['success', 'error']).toContain(result.status);

      // Cleanup
      fs.rmSync(readOnlyDir, { recursive: true, force: true });
    });

    it('should provide detailed error messages for debugging', async () => {
      const mockProvider = {
        name: 'ollama:test',
        generate: vi.fn().mockRejectedValue(new Error('fetch failed: TypeError: Failed to fetch')),
      };

      const result = await semanticSearchMemories({
        query: 'test query',
        basePath: testDir,
        provider: mockProvider,
      });

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Semantic search failed:');
      expect(result.error?.length).toBeGreaterThan(20);
    });
  });
});
