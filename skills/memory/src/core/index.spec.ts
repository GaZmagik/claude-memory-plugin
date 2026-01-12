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
  rebuildIndex,
} from './index.js';
import { MemoryType, Scope } from '../types/enums.js';
import type { MemoryIndex, IndexEntry } from '../types/memory.js';
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

  describe('rebuildIndex', () => {
    it('should rebuild index from filesystem', async () => {
      // rebuildIndex scans basePath directly (not subdirs)
      const memoryContent = `---
id: decision-test-rebuild
title: Test Rebuild Memory
type: decision
scope: local
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags:
  - test
  - rebuild
links: []
---

# Test content`;

      fs.writeFileSync(
        path.join(testDir, 'decision-test-rebuild.md'),
        memoryContent
      );

      const result = await rebuildIndex({ basePath: testDir });

      expect(result.status).toBe('success');
      expect(result.entriesCount).toBe(1);
      expect(result.newEntriesAdded).toBe(1);
      expect(result.orphansRemoved).toBe(0);

      // Verify index was saved
      const index = await loadIndex({ basePath: testDir });
      expect(index.entries).toHaveLength(1);
      expect(index.entries[0].id).toBe('decision-test-rebuild');
    });

    it('should detect and remove orphans from index', async () => {
      // Create an index with an entry that has no corresponding file
      const orphanEntry: IndexEntry = {
        id: 'orphan-memory',
        type: MemoryType.Learning,
        title: 'Orphan Memory',
        tags: [],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Global,
        relativePath: 'learning-orphan-memory.md',
      };
      await addToIndex(testDir, orphanEntry);

      // No files in directory - the index entry is an orphan
      const result = await rebuildIndex({ basePath: testDir });

      expect(result.status).toBe('success');
      expect(result.entriesCount).toBe(0);
      expect(result.orphansRemoved).toBe(1);
    });

    it('should handle multiple memory files', async () => {
      const createMemory = (id: string, type: string, title: string) => `---
id: ${id}
title: ${title}
type: ${type}
scope: local
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
links: []
---

# ${title}`;

      fs.writeFileSync(
        path.join(testDir, 'decision-one.md'),
        createMemory('decision-one', 'decision', 'Decision One')
      );
      fs.writeFileSync(
        path.join(testDir, 'learning-two.md'),
        createMemory('learning-two', 'learning', 'Learning Two')
      );
      fs.writeFileSync(
        path.join(testDir, 'gotcha-three.md'),
        createMemory('gotcha-three', 'gotcha', 'Gotcha Three')
      );

      const result = await rebuildIndex({ basePath: testDir });

      expect(result.status).toBe('success');
      expect(result.entriesCount).toBe(3);
      expect(result.newEntriesAdded).toBe(3);
    });

    it('should handle parse errors gracefully', async () => {
      // Create a valid memory
      const validContent = `---
id: valid-memory
title: Valid Memory
type: decision
scope: local
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
links: []
---

# Valid`;

      // Create an invalid memory (bad YAML)
      const invalidContent = `---
id: invalid-memory
title: [[[invalid yaml
---

# Invalid`;

      fs.writeFileSync(path.join(testDir, 'decision-valid.md'), validContent);
      fs.writeFileSync(path.join(testDir, 'decision-invalid.md'), invalidContent);

      const result = await rebuildIndex({ basePath: testDir });

      // Should succeed with the valid file, skip the invalid one
      expect(result.status).toBe('success');
      expect(result.entriesCount).toBeGreaterThanOrEqual(1);
    });

    it('should return success with zero entries for empty directory', async () => {
      const result = await rebuildIndex({ basePath: testDir });

      expect(result.status).toBe('success');
      expect(result.entriesCount).toBe(0);
      expect(result.newEntriesAdded).toBe(0);
      expect(result.orphansRemoved).toBe(0);
    });

    it('should count only truly new entries', async () => {
      // Add an existing entry to the index
      const existingEntry: IndexEntry = {
        id: 'existing-memory',
        type: MemoryType.Decision,
        title: 'Existing Memory',
        tags: [],
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        scope: Scope.Global,
        relativePath: 'existing-memory.md',
      };
      await addToIndex(testDir, existingEntry);

      // Create the file for the existing entry
      const existingContent = `---
id: existing-memory
title: Existing Memory
type: decision
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
links: []
---

# Existing`;

      // Create a new file not in the index
      const newContent = `---
id: new-memory
title: New Memory
type: learning
scope: local
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
links: []
---

# New`;

      fs.writeFileSync(path.join(testDir, 'existing-memory.md'), existingContent);
      fs.writeFileSync(path.join(testDir, 'new-memory.md'), newContent);

      const result = await rebuildIndex({ basePath: testDir });

      expect(result.status).toBe('success');
      expect(result.entriesCount).toBe(2);
      expect(result.newEntriesAdded).toBe(1); // Only the new-memory is new
      expect(result.orphansRemoved).toBe(0);
    });
  });
});
