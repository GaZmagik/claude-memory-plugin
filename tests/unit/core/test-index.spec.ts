/**
 * T014: Unit test for Index cache operations
 *
 * Tests the index cache that provides fast memory lookups.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createEmptyIndex,
  loadIndex,
  saveIndex,
  addToIndex,
  removeFromIndex,
  findInIndex,
  getIndexPath,
} from '../../../skills/memory/src/core/index.js';
import { MemoryType, Scope } from '../../../skills/memory/src/types/enums.js';
import type { MemoryIndex, IndexEntry } from '../../../skills/memory/src/types/memory.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

describe('Index operations', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'memory-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('createEmptyIndex', () => {
    it('should create a new empty index', () => {
      const index = createEmptyIndex();
      expect(index.version).toBe('1.0.0');
      expect(index.entries).toEqual([]);
      expect(index.lastUpdated).toBeDefined();
    });
  });

  describe('getIndexPath', () => {
    it('should return path to index.json', () => {
      const indexPath = getIndexPath(testDir);
      expect(indexPath).toBe(path.join(testDir, 'index.json'));
    });
  });

  describe('loadIndex', () => {
    it('should load existing index from file', async () => {
      const indexPath = path.join(testDir, 'index.json');
      const mockIndex: MemoryIndex = {
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        entries: [
          {
            id: 'test-memory',
            type: MemoryType.Decision,
            title: 'Test Memory',
            tags: ['test'],
            created: '2026-01-10T12:00:00Z',
            updated: '2026-01-10T12:00:00Z',
            scope: Scope.Global,
            relativePath: 'decision-test-memory.md',
          },
        ],
      };
      fs.writeFileSync(indexPath, JSON.stringify(mockIndex, null, 2));

      const loaded = await loadIndex({ basePath: testDir });
      expect(loaded.entries).toHaveLength(1);
      expect(loaded.entries[0].id).toBe('test-memory');
    });

    it('should return empty index if file does not exist', async () => {
      const loaded = await loadIndex({ basePath: testDir });
      expect(loaded.entries).toEqual([]);
    });

    it('should return empty index on invalid JSON', async () => {
      const indexPath = path.join(testDir, 'index.json');
      fs.writeFileSync(indexPath, 'not valid json');

      const loaded = await loadIndex({ basePath: testDir });
      expect(loaded.entries).toEqual([]);
    });
  });

  describe('saveIndex', () => {
    it('should save index to file', () => {
      const index = createEmptyIndex();

      saveIndex(testDir, index);

      const indexPath = path.join(testDir, 'index.json');
      expect(fs.existsSync(indexPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      expect(content.version).toBe('1.0.0');
    });

    it('should update lastUpdated timestamp', async () => {
      const index = createEmptyIndex();
      const originalTime = index.lastUpdated;

      // Small delay to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
      saveIndex(testDir, index);

      const indexPath = path.join(testDir, 'index.json');
      const content = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      expect(content.lastUpdated).not.toBe(originalTime);
    });
  });

  describe('addToIndex', () => {
    it('should add new entry to index', async () => {
      const entry: IndexEntry = {
        id: 'new-memory',
        type: MemoryType.Learning,
        title: 'New Memory',
        tags: ['new'],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Project,
        relativePath: 'learning-new-memory.md',
      };

      await addToIndex(testDir, entry);

      const loaded = await loadIndex({ basePath: testDir });
      expect(loaded.entries).toHaveLength(1);
      expect(loaded.entries[0].id).toBe('new-memory');
    });

    it('should replace existing entry with same id', async () => {
      const entry1: IndexEntry = {
        id: 'duplicate',
        type: MemoryType.Artifact,
        title: 'Original',
        tags: [],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Global,
        relativePath: 'artifact-duplicate.md',
      };

      const entry2: IndexEntry = {
        ...entry1,
        title: 'Updated',
      };

      await addToIndex(testDir, entry1);
      await addToIndex(testDir, entry2);

      const loaded = await loadIndex({ basePath: testDir });
      expect(loaded.entries).toHaveLength(1);
      expect(loaded.entries[0].title).toBe('Updated');
    });
  });

  describe('removeFromIndex', () => {
    it('should remove entry by id', async () => {
      const entry: IndexEntry = {
        id: 'to-remove',
        type: MemoryType.Gotcha,
        title: 'To Remove',
        tags: [],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Global,
        relativePath: 'gotcha-to-remove.md',
      };

      await addToIndex(testDir, entry);
      const removed = await removeFromIndex(testDir, 'to-remove');

      expect(removed).toBe(true);
      const loaded = await loadIndex({ basePath: testDir });
      expect(loaded.entries).toHaveLength(0);
    });

    it('should return false if entry does not exist', async () => {
      const removed = await removeFromIndex(testDir, 'nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('findInIndex', () => {
    it('should return entry by id', async () => {
      const entry: IndexEntry = {
        id: 'find-me',
        type: MemoryType.Hub,
        title: 'Find Me',
        tags: [],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Global,
        relativePath: 'hub-find-me.md',
      };

      await addToIndex(testDir, entry);
      const result = await findInIndex(testDir, 'find-me');

      expect(result).toBeDefined();
      expect(result?.title).toBe('Find Me');
    });

    it('should return null if not found', async () => {
      const result = await findInIndex(testDir, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('filter operations', () => {
    beforeEach(async () => {
      const entries: IndexEntry[] = [
        {
          id: 'decision-1',
          type: MemoryType.Decision,
          title: 'Decision 1',
          tags: ['typescript'],
          created: '2026-01-10T12:00:00Z',
          updated: '2026-01-10T12:00:00Z',
          scope: Scope.Global,
          relativePath: 'decision-1.md',
        },
        {
          id: 'learning-1',
          type: MemoryType.Learning,
          title: 'Learning 1',
          tags: ['typescript', 'pattern'],
          created: '2026-01-10T12:00:00Z',
          updated: '2026-01-10T12:00:00Z',
          scope: Scope.Global,
          relativePath: 'learning-1.md',
        },
        {
          id: 'artifact-1',
          type: MemoryType.Artifact,
          title: 'Artifact 1',
          tags: ['javascript'],
          created: '2026-01-10T12:00:00Z',
          updated: '2026-01-10T12:00:00Z',
          scope: Scope.Global,
          relativePath: 'artifact-1.md',
        },
      ];

      for (const entry of entries) {
        await addToIndex(testDir, entry);
      }
    });

    it('should filter by type using loadIndex and manual filter', async () => {
      const index = await loadIndex({ basePath: testDir });
      const decisions = index.entries.filter(e => e.type === MemoryType.Decision);

      expect(decisions).toHaveLength(1);
      expect(decisions[0].id).toBe('decision-1');
    });

    it('should filter by tag using loadIndex and manual filter', async () => {
      const index = await loadIndex({ basePath: testDir });
      const typescriptEntries = index.entries.filter(e => e.tags.includes('typescript'));

      expect(typescriptEntries).toHaveLength(2);
    });
  });
});
