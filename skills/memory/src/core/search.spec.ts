/**
 * Tests for T031: Memory Keyword Search
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { searchMemories } from './search.js';
import { writeMemory } from './write.js';
import type { SearchMemoriesRequest } from '../types/api.js';
import { MemoryType, Scope } from '../types/enums.js';
import { existsSync, rmSync, mkdirSync } from 'fs';

describe('searchMemories', () => {
  const testBasePath = '/tmp/search-test';

  beforeEach(() => {
    if (existsSync(testBasePath)) {
      rmSync(testBasePath, { recursive: true });
    }
    mkdirSync(testBasePath, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testBasePath)) {
      rmSync(testBasePath, { recursive: true });
    }
  });

  describe('validation', () => {
    it('should return error when query is empty', async () => {
      const request: SearchMemoriesRequest = {
        query: '',
        basePath: testBasePath,
      };

      const result = await searchMemories(request);

      expect(result.status).toBe('error');
      expect(result.error).toBe('query is required');
    });

    it('should return error when query is whitespace only', async () => {
      const request: SearchMemoriesRequest = {
        query: '   ',
        basePath: testBasePath,
      };

      const result = await searchMemories(request);

      expect(result.status).toBe('error');
      expect(result.error).toBe('query is required');
    });

    it('should trim query before searching', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'test memory',
        content: 'test content',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: '  test  ',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results).toBeDefined();
      expect(result.results!.length).toBeGreaterThan(0);
    });

    it('should return error when query exceeds max length', async () => {
      const longQuery = 'a'.repeat(10001);
      const result = await searchMemories({
        query: longQuery,
        basePath: testBasePath,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Query too long');
    });
  });

  describe('matching', () => {
    it('should match query in title', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'TypeScript Guide',
        content: 'content here',
        tags: ['guide'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'TypeScript',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(1);
      expect(result.results![0]!.title).toBe('TypeScript Guide');
    });

    it('should match query in tags', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'Guide',
        content: 'content',
        tags: ['typescript', 'programming'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'typescript',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(1);
    });

    it('should match query in content', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'Guide',
        content: 'This is about TypeScript and its features',
        tags: ['guide'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'TypeScript',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(1);
    });

    it('should be case insensitive', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'TypeScript',
        content: 'content',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'typescript',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(1);
    });
  });

  describe('scoring', () => {
    it('should score title matches higher than content matches', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'parser guide',
        content: 'content about other things',
        tags: ['guide'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      await writeMemory({
        type: MemoryType.Learning,
        title: 'other guide',
        content: 'content about parser implementation',
        tags: ['guide'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'parser',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(2);
      expect(result.results![0]!.title).toBe('parser guide');
    });

    it('should score exact title matches highest', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'parser',
        content: 'content',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      await writeMemory({
        type: MemoryType.Learning,
        title: 'parser guide',
        content: 'content',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'parser',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results![0]!.title).toBe('parser');
    });

    it('should score tag matches higher than content', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'guide a',
        content: 'some content',
        tags: ['parser'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      await writeMemory({
        type: MemoryType.Learning,
        title: 'guide b',
        content: 'parser implementation details',
        tags: ['other'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'parser',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results![0]!.title).toBe('guide a');
    });

    it('should increase score for multiple content occurrences', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'guide a',
        content: 'parser parser parser',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      await writeMemory({
        type: MemoryType.Learning,
        title: 'guide b',
        content: 'parser',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'parser',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results![0]!.score).toBeGreaterThan(result.results![1]!.score);
    });

    it('should cap score at 1.0', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'parser',
        content: 'parser parser parser',
        tags: ['parser'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'parser',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results![0]!.score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('snippets', () => {
    it('should extract snippet around first match', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'Guide',
        content: 'This is some content before the parser keyword and some after',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'parser',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results![0]!.snippet).toBeDefined();
      expect(result.results![0]!.snippet).toContain('parser');
    });

    it('should add leading ellipsis when match not at start', async () => {
      const longContent = 'a'.repeat(100) + ' parser keyword';
      await writeMemory({
        type: MemoryType.Learning,
        title: 'Guide',
        content: longContent,
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'parser',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results![0]!.snippet).toMatch(/^\.\.\./);
    });

    it('should add trailing ellipsis when match not at end', async () => {
      const longContent = 'parser keyword ' + 'a'.repeat(200);
      await writeMemory({
        type: MemoryType.Learning,
        title: 'Guide',
        content: longContent,
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'parser',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results![0]!.snippet).toMatch(/\.\.\.$/);
    });

    it('should truncate snippet to max length', async () => {
      const longContent = 'parser ' + 'a'.repeat(500);
      await writeMemory({
        type: MemoryType.Learning,
        title: 'Guide',
        content: longContent,
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'parser',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results![0]!.snippet!.length).toBeLessThanOrEqual(153); // 150 + "..."
    });

    it('should return undefined snippet when no content match', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'parser guide',
        content: 'other content',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'parser',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results![0]!.snippet).toBeUndefined();
    });
  });

  describe('filtering', () => {
    it('should filter by type', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'learning test',
        content: 'content',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      await writeMemory({
        type: MemoryType.Gotcha,
        title: 'gotcha test',
        content: 'content',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'test',
        type: MemoryType.Learning,
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(1);
      expect(result.results![0]!.type).toBe(MemoryType.Learning);
    });

    it('should filter by scope', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'test memory',
        content: 'content',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'test',
        scope: Scope.Local,
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results!.length).toBeGreaterThan(0);
    });

    it('should combine filters with search', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'learning test',
        content: 'content',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'test',
        type: MemoryType.Learning,
        scope: Scope.Local,
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(1);
    });
  });

  describe('sorting and limiting', () => {
    it('should sort results by score descending', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'parser',
        content: 'content',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      await writeMemory({
        type: MemoryType.Learning,
        title: 'other',
        content: 'parser content',
        tags: ['test'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'parser',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results![0]!.score).toBeGreaterThanOrEqual(result.results![1]!.score);
    });

    it('should apply default limit of 20', async () => {
      for (let i = 0; i < 25; i++) {
        await writeMemory({
          type: MemoryType.Learning,
          title: `test ${i}`,
          content: 'test content',
          tags: ['test'],
          scope: Scope.Local,
          basePath: testBasePath,
        });
      }

      const result = await searchMemories({
        query: 'test',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(20);
    });

    it('should apply custom limit when specified', async () => {
      for (let i = 0; i < 10; i++) {
        await writeMemory({
          type: MemoryType.Learning,
          title: `test ${i}`,
          content: 'test content',
          tags: ['test'],
          scope: Scope.Local,
          basePath: testBasePath,
        });
      }

      const result = await searchMemories({
        query: 'test',
        limit: 5,
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results).toHaveLength(5);
    });
  });

  describe('error handling', () => {
    it('should return empty results when no matches', async () => {
      await writeMemory({
        type: MemoryType.Learning,
        title: 'something else',
        content: 'other content',
        tags: ['other'],
        scope: Scope.Local,
        basePath: testBasePath,
      });

      const result = await searchMemories({
        query: 'nonexistent',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results).toEqual([]);
    });

    it('should handle empty index gracefully', async () => {
      const result = await searchMemories({
        query: 'test',
        basePath: testBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.results).toEqual([]);
    });
  });
});
