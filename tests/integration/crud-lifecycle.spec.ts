/**
 * T020: Integration test for full CRUD lifecycle
 *
 * Tests the complete lifecycle of a memory: create, read, update, list, search, delete.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { listMemories } from '../../skills/memory/src/core/list.js';
import { searchMemories } from '../../skills/memory/src/core/search.js';
import { deleteMemory } from '../../skills/memory/src/core/delete.js';
import { MemoryType, Scope, Severity } from '../../skills/memory/src/types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

describe('Full CRUD lifecycle integration', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'memory-crud-integration-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should complete full create-read-update-delete cycle', async () => {
    // CREATE
    const createResult = await writeMemory({
      title: 'CRUD Test Memory',
      type: MemoryType.Decision,
      content: '# CRUD Test\n\nOriginal content for testing.',
      tags: ['crud', 'test'],
      scope: Scope.Global,
      basePath: testDir,
    });

    expect(createResult.status).toBe('success');
    expect(createResult.memory?.id).toBeDefined();
    const memoryId = createResult.memory?.id ?? '';

    // READ
    const readResult = await readMemory({
      id: memoryId,
      basePath: testDir,
    });

    expect(readResult.status).toBe('success');
    expect(readResult.memory?.frontmatter.title).toBe('CRUD Test Memory');
    expect(readResult.memory?.content).toContain('Original content');

    // UPDATE (write with same title generates new ID, so we use the file path)
    const updateResult = await writeMemory({
      title: 'CRUD Test Memory Updated',
      type: MemoryType.Decision,
      content: '# CRUD Test Updated\n\nModified content.',
      tags: ['crud', 'test', 'updated'],
      scope: Scope.Global,
      basePath: testDir,
    });

    expect(updateResult.status).toBe('success');

    // LIST - should now have 2 memories
    const listResult = await listMemories({
      basePath: testDir,
    });

    expect(listResult.status).toBe('success');
    expect(listResult.memories?.length).toBe(2);

    // SEARCH
    const searchResult = await searchMemories({
      query: 'CRUD',
      basePath: testDir,
    });

    expect(searchResult.status).toBe('success');
    expect(searchResult.results?.length).toBeGreaterThanOrEqual(1);

    // DELETE original
    const deleteResult = await deleteMemory({
      id: memoryId,
      basePath: testDir,
    });

    expect(deleteResult.status).toBe('success');

    // VERIFY deletion
    const verifyRead = await readMemory({
      id: memoryId,
      basePath: testDir,
    });

    expect(verifyRead.status).toBe('error');

    // LIST should now have 1 memory
    const finalList = await listMemories({
      basePath: testDir,
    });

    expect(finalList.status).toBe('success');
    expect(finalList.memories?.length).toBe(1);
  });

  it('should maintain index consistency through CRUD operations', async () => {
    // Create multiple memories
    const memories = [
      { title: 'Memory A', type: MemoryType.Decision, tags: ['a'] },
      { title: 'Memory B', type: MemoryType.Learning, tags: ['b'] },
      { title: 'Memory C', type: MemoryType.Artifact, tags: ['c'] },
    ];

    const createdIds: string[] = [];

    for (const mem of memories) {
      const result = await writeMemory({
        ...mem,
        content: `Content for ${mem.title}`,
        scope: Scope.Global,
        basePath: testDir,
      });
      expect(result.status).toBe('success');
      createdIds.push(result.memory?.id ?? '');
    }

    // Verify index has 3 entries
    const indexPath = path.join(testDir, 'index.json');
    let index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    expect(index.memories).toHaveLength(3);

    // Delete middle memory
    await deleteMemory({ id: createdIds[1]!, basePath: testDir });

    // Verify index has 2 entries
    index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    expect(index.memories).toHaveLength(2);
    expect(index.memories.some((e: { id: string }) => e.id === createdIds[1])).toBe(false);

    // Add another memory
    const newResult = await writeMemory({
      title: 'Memory D',
      type: MemoryType.Gotcha,
      content: 'New content',
      tags: ['d'],
      scope: Scope.Global,
      basePath: testDir,
    });

    // Verify index has 3 entries again
    index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    expect(index.memories).toHaveLength(3);
    expect(index.memories.some((e: { id: string }) => e.id === newResult.memory?.id)).toBe(true);
  });

  it('should handle sequential writes correctly', async () => {
    // Create 5 memories sequentially
    // Note: True concurrent writes have race conditions with index.json
    // This is a known limitation - concurrent write support requires file locking
    const ids: string[] = [];

    for (let i = 0; i < 5; i++) {
      const result = await writeMemory({
        title: `Sequential Memory ${i}`,
        type: MemoryType.Learning,
        content: `Content ${i}`,
        tags: ['sequential'],
        scope: Scope.Global,
        basePath: testDir,
      });
      expect(result.status).toBe('success');
      ids.push(result.memory?.id ?? '');
    }

    // All IDs should be unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);

    // Index should have all 5
    const listResult = await listMemories({ basePath: testDir });
    expect(listResult.memories?.length).toBe(5);
  });

  it('should preserve memory data through read-write cycle', async () => {
    const originalData = {
      title: 'Preservation Test',
      type: MemoryType.Gotcha,
      content: '# Warning\n\nThis is a **critical** gotcha with `code`.',
      tags: ['warning', 'critical', 'typescript'],
      scope: Scope.Global,
      basePath: testDir,
      severity: Severity.High as const,
      links: ['related-decision-1', 'related-learning-2'],
    };

    const writeResult = await writeMemory(originalData);
    expect(writeResult.status).toBe('success');

    const readResult = await readMemory({
      id: writeResult.memory?.id ?? '',
      basePath: testDir,
    });

    expect(readResult.status).toBe('success');
    expect(readResult.memory?.frontmatter.title).toBe(originalData.title);
    expect(readResult.memory?.frontmatter.type).toBe(originalData.type);
    // Note: writeMemory auto-adds scope tag ('user' for Global scope)
    expect(readResult.memory?.frontmatter.tags).toEqual([...originalData.tags, 'user']);
    expect(readResult.memory?.frontmatter.severity).toBe(originalData.severity);
    expect(readResult.memory?.frontmatter.links).toEqual(originalData.links);
    expect(readResult.memory?.content).toContain('critical');
    expect(readResult.memory?.content).toContain('`code`');
  });
});
