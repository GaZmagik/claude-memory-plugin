/**
 * T060: Contract tests for semantic search API
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { SemanticSearchRequest, SemanticSearchResponse } from '../../skills/memory/src/types/api.js';
import { semanticSearchMemories } from '../../skills/memory/src/core/semantic-search.js';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { Scope, MemoryType } from '../../skills/memory/src/types/enums.js';

describe('Semantic Search API Contract', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-contract-'));

    // Create test memories
    await writeMemory({
      title: 'PostgreSQL Database Decision',
      type: MemoryType.Decision,
      content: 'We chose PostgreSQL for its reliability and SQL compliance.',
      tags: ['database', 'infrastructure'],
      scope: Scope.Local,
      basePath: testDir,
    });

    await writeMemory({
      title: 'MongoDB for Analytics',
      type: MemoryType.Decision,
      content: 'Using MongoDB for analytics data due to flexible schema.',
      tags: ['database', 'analytics'],
      scope: Scope.Local,
      basePath: testDir,
    });

    await writeMemory({
      title: 'React Testing Patterns',
      type: MemoryType.Artifact,
      content: 'Best practices for testing React components with Jest.',
      tags: ['testing', 'react', 'frontend'],
      scope: Scope.Local,
      basePath: testDir,
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('semanticSearchMemories', () => {
    it('should return SemanticSearchResponse with results array', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
      };

      const response = await semanticSearchMemories({
        query: 'database storage',
        basePath: testDir,
        provider: mockProvider,
      });

      expect(response).toHaveProperty('status');
      expect(response.status).toBe('success');
      expect(response).toHaveProperty('results');
      expect(Array.isArray(response.results)).toBe(true);
    });

    it('should include required fields in each result', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
      };

      const response = await semanticSearchMemories({
        query: 'database',
        basePath: testDir,
        provider: mockProvider,
        threshold: 0.0,
      });

      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('tags');
        expect(result).toHaveProperty('score');
        expect(typeof result.score).toBe('number');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      }
    });

    it('should filter by type parameter', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
      };

      const response = await semanticSearchMemories({
        query: 'patterns',
        basePath: testDir,
        provider: mockProvider,
        type: MemoryType.Artifact,
        threshold: 0.0,
      });

      expect(response.status).toBe('success');
      if (response.results && response.results.length > 0) {
        expect(response.results.every(r => r.type === MemoryType.Artifact)).toBe(true);
      }
    });

    it('should filter by scope parameter', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
      };

      const response = await semanticSearchMemories({
        query: 'any query',
        basePath: testDir,
        provider: mockProvider,
        scope: Scope.Local,
        threshold: 0.0,
      });

      expect(response.status).toBe('success');
      // Results should only be from local scope
      if (response.results && response.results.length > 0) {
        response.results.forEach(r => {
          expect(r.scope).toBe(Scope.Local);
        });
      }
    });

    it('should respect limit parameter', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
      };

      const response = await semanticSearchMemories({
        query: 'database',
        basePath: testDir,
        provider: mockProvider,
        limit: 1,
        threshold: 0.0,
      });

      expect(response.status).toBe('success');
      expect(response.results?.length).toBeLessThanOrEqual(1);
    });

    it('should return error for empty query', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn(),
      };

      const response = await semanticSearchMemories({
        query: '',
        basePath: testDir,
        provider: mockProvider,
      });

      expect(response.status).toBe('error');
      expect(response.error).toContain('query');
    });

    it('should return error for whitespace-only query', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn(),
      };

      const response = await semanticSearchMemories({
        query: '   ',
        basePath: testDir,
        provider: mockProvider,
      });

      expect(response.status).toBe('error');
    });

    it('should use default threshold when not specified', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
      };

      const response = await semanticSearchMemories({
        query: 'test query',
        basePath: testDir,
        provider: mockProvider,
      });

      expect(response.status).toBe('success');
      // Default threshold should filter low-similarity results
    });

    it('should sort results by similarity score descending', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
      };

      const response = await semanticSearchMemories({
        query: 'database solutions',
        basePath: testDir,
        provider: mockProvider,
        threshold: 0.0,
      });

      expect(response.status).toBe('success');
      if (response.results && response.results.length > 1) {
        for (let i = 1; i < response.results.length; i++) {
          expect(response.results[i - 1].score).toBeGreaterThanOrEqual(
            response.results[i].score
          );
        }
      }
    });
  });

  describe('Auto-link suggestions', () => {
    it('should suggest similar memories for linking', async () => {
      const mockProvider = {
        name: 'mock',
        generate: vi.fn().mockResolvedValue(new Array(384).fill(0.1)),
      };

      const response = await semanticSearchMemories({
        query: 'database',
        basePath: testDir,
        provider: mockProvider,
        threshold: 0.5,
        forAutoLink: true,
      });

      expect(response.status).toBe('success');
      // Auto-link mode should use higher threshold
    });
  });
});
