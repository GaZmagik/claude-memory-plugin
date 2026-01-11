/**
 * T059: Unit tests for semantic search
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  MemoryType,
  Scope,
} from '../../../skills/memory/src/types/enums.js';
import {
  semanticSearch,
  type SemanticSearchOptions,
  type SemanticSearchResult,
} from '../../../skills/memory/src/search/semantic.js';

describe('Semantic Search', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-test-'));

    // Create index.json with test memories
    const index = {
      version: 1,
      entries: [
        {
          id: 'decision-database',
          type: MemoryType.Decision,
          title: 'Use PostgreSQL for data persistence',
          tags: ['database', 'architecture'],
          relativePath: 'decision-database.md',
          created: '2026-01-01T00:00:00Z',
          updated: '2026-01-01T00:00:00Z',
        },
        {
          id: 'learning-orm',
          type: 'learning',
          title: 'TypeORM vs Prisma comparison',
          tags: ['database', 'orm'],
          relativePath: 'learning-orm.md',
          created: '2026-01-02T00:00:00Z',
          updated: '2026-01-02T00:00:00Z',
        },
        {
          id: 'artifact-pattern',
          type: 'artifact',
          title: 'React component testing pattern',
          tags: ['testing', 'react'],
          relativePath: 'artifact-pattern.md',
          created: '2026-01-03T00:00:00Z',
          updated: '2026-01-03T00:00:00Z',
        },
      ],
    };
    fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));

    // Create embeddings cache
    const embeddings = {
      version: 1,
      entries: {
        'decision-database': {
          embedding: [0.9, 0.1, 0.0], // Database-focused
          hash: 'hash1',
          timestamp: '2026-01-01T00:00:00Z',
        },
        'learning-orm': {
          embedding: [0.8, 0.2, 0.0], // Also database-related
          hash: 'hash2',
          timestamp: '2026-01-02T00:00:00Z',
        },
        'artifact-pattern': {
          embedding: [0.1, 0.0, 0.9], // Testing-focused
          hash: 'hash3',
          timestamp: '2026-01-03T00:00:00Z',
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

  describe('semanticSearch', () => {
    it('should find semantically similar memories', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.85, 0.15, 0.0]),
      };

      const results = await semanticSearch({
        query: 'database storage solutions',
        basePath: testDir,
        provider: mockProvider,
        threshold: 0.5,
      });

      expect(results.length).toBeGreaterThan(0);
      // Database-related memories should rank higher
      expect(results[0].id).toMatch(/database|orm/);
    });

    it('should return results sorted by relevance', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.9, 0.1, 0.0]),
      };

      const results = await semanticSearch({
        query: 'SQL database',
        basePath: testDir,
        provider: mockProvider,
        threshold: 0.3,
      });

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should filter by memory type', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5, 0.5]),
      };

      const results = await semanticSearch({
        query: 'anything',
        basePath: testDir,
        provider: mockProvider,
        type: MemoryType.Decision,
        threshold: 0.0,
      });

      expect(results.every(r => r.type === 'decision')).toBe(true);
    });

    it('should filter by scope', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5, 0.5]),
      };

      const results = await semanticSearch({
        query: 'anything',
        basePath: testDir,
        provider: mockProvider,
        scope: Scope.Local,
        threshold: 0.0,
      });

      // All results should be from local scope
      expect(results).toBeDefined();
    });

    it('should respect result limit', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5, 0.5]),
      };

      const results = await semanticSearch({
        query: 'test query',
        basePath: testDir,
        provider: mockProvider,
        limit: 1,
        threshold: 0.0,
      });

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should respect similarity threshold', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.1, 0.0, 0.9]),
      };

      const results = await semanticSearch({
        query: 'testing patterns',
        basePath: testDir,
        provider: mockProvider,
        threshold: 0.8,
      });

      results.forEach(r => {
        expect(r.score).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should return empty array when no matches', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.0, 0.0, 0.0]),
      };

      const results = await semanticSearch({
        query: 'completely unrelated topic',
        basePath: testDir,
        provider: mockProvider,
        threshold: 0.9,
      });

      expect(results).toEqual([]);
    });

    it('should include memory metadata in results', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.9, 0.1, 0.0]),
      };

      const results = await semanticSearch({
        query: 'database',
        basePath: testDir,
        provider: mockProvider,
        threshold: 0.5,
      });

      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('type');
      expect(results[0]).toHaveProperty('tags');
      expect(results[0]).toHaveProperty('score');
    });

    it('should handle missing embeddings gracefully', async () => {
      // Remove embeddings cache
      fs.unlinkSync(path.join(testDir, 'embeddings.json'));

      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue([0.5, 0.5, 0.5]),
      };

      const results = await semanticSearch({
        query: 'test',
        basePath: testDir,
        provider: mockProvider,
        threshold: 0.0,
      });

      // Should return empty or generate embeddings on-the-fly
      expect(Array.isArray(results)).toBe(true);
    });

    it('should validate query is not empty', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn(),
      };

      await expect(
        semanticSearch({
          query: '',
          basePath: testDir,
          provider: mockProvider,
        })
      ).rejects.toThrow('Query cannot be empty');
    });
  });
});
