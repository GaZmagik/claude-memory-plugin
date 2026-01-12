/**
 * Tests for T030: Memory List Operation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listMemories } from './list.js';
import { writeMemory } from './write.js';
import type { ListMemoriesRequest } from '../types/api.js';
import { Scope, MemoryType } from '../types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('listMemories', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a unique test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'list-test-'));
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('basic listing', () => {
    it('should list all memories when no filters provided', async () => {
      // Create test memories
      await writeMemory({
        basePath: testDir,
        type: MemoryType.Learning,
        scope: Scope.Global,
        title: 'Test Learning',
        content: 'Test content',
        tags: [],
      });

      await writeMemory({
        basePath: testDir,
        type: MemoryType.Gotcha,
        scope: Scope.Project,
        title: 'Test Gotcha',
        content: 'Test content',
        tags: [],
      });

      const request: ListMemoriesRequest = { basePath: testDir };
      const result = await listMemories(request);

      expect(result.status).toBe('success');
      expect(result.memories).toBeDefined();
      expect(result.memories!.length).toBe(2);
      expect(result.count).toBe(2);
    });

    it('should use custom basePath when provided', async () => {
      await writeMemory({
        basePath: testDir,
        type: MemoryType.Learning,
        scope: Scope.Global,
        title: 'Test Memory',
        content: 'Test content',
        tags: [],
      });

      const result = await listMemories({ basePath: testDir });

      expect(result.status).toBe('success');
      expect(result.memories!.length).toBe(1);
    });
  });

  describe('filtering', () => {
    beforeEach(async () => {
      // Create diverse test data
      await writeMemory({
        basePath: testDir,
        type: MemoryType.Learning,
        scope: Scope.Global,
        title: 'Global Learning',
        content: 'Test content',
        tags: ['typescript', 'testing'],
      });

      await writeMemory({
        basePath: testDir,
        type: MemoryType.Gotcha,
        scope: Scope.Project,
        title: 'Project Gotcha',
        content: 'Test content',
        tags: ['typescript'],
      });

      await writeMemory({
        basePath: testDir,
        type: MemoryType.Decision,
        scope: Scope.Local,
        title: 'Local Decision',
        content: 'Test content',
        tags: ['architecture'],
      });
    });

    it('should filter by type', async () => {
      const result = await listMemories({ basePath: testDir, type: MemoryType.Learning });

      expect(result.status).toBe('success');
      expect(result.memories!.length).toBe(1);
      expect(result.memories![0].type).toBe('learning');
      expect(result.memories![0].title).toBe('Global Learning');
      expect(result.memories![0].scope).toBe(Scope.Global);
      expect(result.memories![0].tags).toContain('typescript');
      expect(result.memories![0].tags).toContain('testing');
    });

    it('should filter by scope', async () => {
      const result = await listMemories({ basePath: testDir, scope: Scope.Project });

      expect(result.status).toBe('success');
      expect(result.memories!.length).toBe(1);
      expect(result.memories![0].scope).toBe(Scope.Project);
      expect(result.memories![0].type).toBe('gotcha');
      expect(result.memories![0].title).toBe('Project Gotcha');
    });

    it('should filter by single tag', async () => {
      const result = await listMemories({ basePath: testDir, tag: 'typescript' });

      expect(result.status).toBe('success');
      expect(result.memories!.length).toBe(2);
      expect(result.memories!.every(m => m.tags.includes('typescript'))).toBe(true);
    });

    it('should filter by multiple tags with AND logic', async () => {
      const result = await listMemories({
        basePath: testDir,
        tags: ['typescript', 'testing']
      });

      expect(result.status).toBe('success');
      expect(result.memories!.length).toBe(1);
      expect(result.memories![0].title).toBe('Global Learning');
      expect(result.memories![0].tags).toContain('typescript');
      expect(result.memories![0].tags).toContain('testing');
    });

    it('should combine multiple filters', async () => {
      const result = await listMemories({
        basePath: testDir,
        type: MemoryType.Gotcha,
        scope: Scope.Project,
        tag: 'typescript',
      });

      expect(result.status).toBe('success');
      expect(result.memories!.length).toBe(1);
      expect(result.memories![0].type).toBe('gotcha');
      expect(result.memories![0].scope).toBe(Scope.Project);
      expect(result.memories![0].tags).toContain('typescript');
    });
  });

  describe('sorting', () => {
    beforeEach(async () => {
      // Create memories with different dates
      await writeMemory({
        basePath: testDir,
        type: MemoryType.Learning,
        scope: Scope.Global,
        title: 'Alpha',
        content: 'First created',
        tags: [],
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await writeMemory({
        basePath: testDir,
        type: MemoryType.Learning,
        scope: Scope.Global,
        title: 'Zulu',
        content: 'Second created',
        tags: [],
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await writeMemory({
        basePath: testDir,
        type: MemoryType.Learning,
        scope: Scope.Global,
        title: 'Beta',
        content: 'Third created',
        tags: [],
      });
    });

    it('should sort by created date descending by default', async () => {
      const result = await listMemories({ basePath: testDir });

      expect(result.status).toBe('success');
      expect(result.memories![0].title).toBe('Beta'); // Most recent
      expect(result.memories![2].title).toBe('Alpha'); // Oldest
    });

    it('should sort by created date ascending when specified', async () => {
      const result = await listMemories({
        basePath: testDir,
        sortBy: 'created',
        sortOrder: 'asc',
      });

      expect(result.status).toBe('success');
      expect(result.memories![0].title).toBe('Alpha'); // Oldest
      expect(result.memories![2].title).toBe('Beta'); // Most recent
    });

    it('should sort by updated date', async () => {
      const result = await listMemories({
        basePath: testDir,
        sortBy: 'updated',
        sortOrder: 'desc',
      });

      expect(result.status).toBe('success');
      expect(result.memories!.length).toBe(3);
      // Verify dates are in descending order
      const dates = result.memories!.map(m => new Date(m.updated).getTime());
      expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
      expect(dates[1]).toBeGreaterThanOrEqual(dates[2]);
    });

    it('should sort by title alphabetically', async () => {
      const result = await listMemories({
        basePath: testDir,
        sortBy: 'title',
        sortOrder: 'asc',
      });

      expect(result.status).toBe('success');
      expect(result.memories![0].title).toBe('Alpha');
      expect(result.memories![1].title).toBe('Beta');
      expect(result.memories![2].title).toBe('Zulu');
    });
  });

  describe('limiting', () => {
    beforeEach(async () => {
      // Create 5 test memories
      for (let i = 0; i < 5; i++) {
        await writeMemory({
          basePath: testDir,
          type: MemoryType.Learning,
          scope: Scope.Global,
          title: `Memory ${i}`,
          content: 'Test content',
          tags: [],
        });
      }
    });

    it('should apply limit when specified', async () => {
      const result = await listMemories({ basePath: testDir, limit: 3 });

      expect(result.status).toBe('success');
      expect(result.memories!.length).toBe(3);
    });

    it('should return total count before limit', async () => {
      const result = await listMemories({ basePath: testDir, limit: 2 });

      expect(result.status).toBe('success');
      expect(result.memories!.length).toBe(2);
      expect(result.count).toBe(5); // Total count before limit
    });

    it('should handle limit larger than result set', async () => {
      const result = await listMemories({ basePath: testDir, limit: 100 });

      expect(result.status).toBe('success');
      expect(result.memories!.length).toBe(5);
      expect(result.count).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should handle index loading errors', async () => {
      // Use a path that doesn't exist or has no .claude directory
      const nonExistentPath = path.join(testDir, 'nonexistent');

      const result = await listMemories({ basePath: nonExistentPath });

      // Should either succeed with empty results or return an error
      // The implementation returns success with empty results for new directories
      expect(result.status).toBe('success');
      expect(result.memories!.length).toBe(0);
      expect(result.count).toBe(0);
    });
  });
});
