/**
 * T014: Unit test for Index cache operations
 *
 * Tests the index cache that provides fast memory lookups.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createIndex,
  loadIndex,
  saveIndex,
  addEntry,
  removeEntry,
  updateEntry,
  findByType,
  findByTag,
  findById
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

  describe('createIndex', () => {
    it('should create a new empty index', () => {
      const index = createIndex();
      expect(index.version).toBe('1.0.0');
      expect(index.entries).toEqual([]);
      expect(index.lastUpdated).toBeDefined();
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
            relativePath: 'permanent/decision-test-memory.md',
          },
        ],
      };
      fs.writeFileSync(indexPath, JSON.stringify(mockIndex, null, 2));

      const loaded = await loadIndex(indexPath);
      expect(loaded.entries).toHaveLength(1);
      expect(loaded.entries[0].id).toBe('test-memory');
    });

    it('should return new index if file does not exist', async () => {
      const indexPath = path.join(testDir, 'nonexistent.json');
      const loaded = await loadIndex(indexPath);
      expect(loaded.entries).toEqual([]);
    });

    it('should throw on invalid JSON', async () => {
      const indexPath = path.join(testDir, 'invalid.json');
      fs.writeFileSync(indexPath, 'not valid json');

      await expect(loadIndex(indexPath)).rejects.toThrow();
    });
  });

  describe('saveIndex', () => {
    it('should save index to file', async () => {
      const indexPath = path.join(testDir, 'index.json');
      const index = createIndex();

      await saveIndex(indexPath, index);

      expect(fs.existsSync(indexPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      expect(content.version).toBe('1.0.0');
    });

    it('should update lastUpdated timestamp', async () => {
      const indexPath = path.join(testDir, 'index.json');
      const index = createIndex();
      const originalTime = index.lastUpdated;

      // Small delay to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));
      await saveIndex(indexPath, index);

      const content = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      expect(content.lastUpdated).not.toBe(originalTime);
    });
  });

  describe('addEntry', () => {
    it('should add new entry to index', () => {
      const index = createIndex();
      const entry: IndexEntry = {
        id: 'new-memory',
        type: MemoryType.Learning,
        title: 'New Memory',
        tags: ['new'],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Project,
        relativePath: 'permanent/learning-new-memory.md',
      };

      const updated = addEntry(index, entry);
      expect(updated.entries).toHaveLength(1);
      expect(updated.entries[0].id).toBe('new-memory');
    });

    it('should not duplicate existing entries', () => {
      const index = createIndex();
      const entry: IndexEntry = {
        id: 'duplicate',
        type: MemoryType.Artifact,
        title: 'Duplicate',
        tags: [],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Global,
        relativePath: 'permanent/artifact-duplicate.md',
      };

      let updated = addEntry(index, entry);
      updated = addEntry(updated, entry);
      expect(updated.entries).toHaveLength(1);
    });
  });

  describe('removeEntry', () => {
    it('should remove entry by id', () => {
      const index = createIndex();
      const entry: IndexEntry = {
        id: 'to-remove',
        type: MemoryType.Gotcha,
        title: 'To Remove',
        tags: [],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Global,
        relativePath: 'permanent/gotcha-to-remove.md',
      };

      let updated = addEntry(index, entry);
      updated = removeEntry(updated, 'to-remove');
      expect(updated.entries).toHaveLength(0);
    });

    it('should do nothing if entry does not exist', () => {
      const index = createIndex();
      const updated = removeEntry(index, 'nonexistent');
      expect(updated.entries).toHaveLength(0);
    });
  });

  describe('updateEntry', () => {
    it('should update existing entry', () => {
      const index = createIndex();
      const entry: IndexEntry = {
        id: 'to-update',
        type: MemoryType.Decision,
        title: 'Original Title',
        tags: ['original'],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Global,
        relativePath: 'permanent/decision-to-update.md',
      };

      let updated = addEntry(index, entry);
      updated = updateEntry(updated, 'to-update', { title: 'New Title', tags: ['updated'] });

      expect(updated.entries[0].title).toBe('New Title');
      expect(updated.entries[0].tags).toEqual(['updated']);
    });
  });

  describe('findByType', () => {
    it('should return entries matching type', () => {
      let index = createIndex();
      index = addEntry(index, {
        id: 'decision-1',
        type: MemoryType.Decision,
        title: 'Decision 1',
        tags: [],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Global,
        relativePath: 'permanent/decision-1.md',
      });
      index = addEntry(index, {
        id: 'learning-1',
        type: MemoryType.Learning,
        title: 'Learning 1',
        tags: [],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Global,
        relativePath: 'permanent/learning-1.md',
      });

      const decisions = findByType(index, MemoryType.Decision);
      expect(decisions).toHaveLength(1);
      expect(decisions[0].id).toBe('decision-1');
    });
  });

  describe('findByTag', () => {
    it('should return entries containing tag', () => {
      let index = createIndex();
      index = addEntry(index, {
        id: 'tagged-1',
        type: MemoryType.Artifact,
        title: 'Tagged 1',
        tags: ['typescript', 'pattern'],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Global,
        relativePath: 'permanent/artifact-tagged-1.md',
      });
      index = addEntry(index, {
        id: 'tagged-2',
        type: MemoryType.Artifact,
        title: 'Tagged 2',
        tags: ['javascript'],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Global,
        relativePath: 'permanent/artifact-tagged-2.md',
      });

      const results = findByTag(index, 'typescript');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('tagged-1');
    });
  });

  describe('findById', () => {
    it('should return entry by id', () => {
      let index = createIndex();
      index = addEntry(index, {
        id: 'find-me',
        type: MemoryType.Hub,
        title: 'Find Me',
        tags: [],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Global,
        relativePath: 'permanent/hub-find-me.md',
      });

      const result = findById(index, 'find-me');
      expect(result).toBeDefined();
      expect(result?.title).toBe('Find Me');
    });

    it('should return undefined if not found', () => {
      const index = createIndex();
      const result = findById(index, 'nonexistent');
      expect(result).toBeUndefined();
    });
  });
});
