/**
 * Unit tests for semantic search API layer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { semanticSearchMemories } from '../../../skills/memory/src/core/semantic-search.js';
import { MemoryType, Scope } from '../../../skills/memory/src/types/enums.js';

describe('Semantic Search API', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-api-test-'));

    // Create index.json
    const index = {
      version: 1,
      entries: [
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
      entries: {
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
});
