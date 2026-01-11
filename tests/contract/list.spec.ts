/**
 * T017: Contract test for ListMemoriesRequest/Response
 *
 * Tests the list memories operation contract.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listMemories } from '../../skills/memory/src/core/list.js';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';
import type { ListMemoriesRequest } from '../../skills/memory/src/types/api.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

describe('listMemories contract', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'memory-list-test-'));

    // Create some test memories
    await writeMemory({
      title: 'Decision One',
      type: MemoryType.Decision,
      content: 'First decision',
      tags: ['auth', 'security'],
      scope: Scope.Global,
      basePath: testDir,
    });

    await writeMemory({
      title: 'Decision Two',
      type: MemoryType.Decision,
      content: 'Second decision',
      tags: ['database'],
      scope: Scope.Global,
      basePath: testDir,
    });

    await writeMemory({
      title: 'Learning One',
      type: MemoryType.Learning,
      content: 'A learning',
      tags: ['typescript'],
      scope: Scope.Global,
      basePath: testDir,
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should list all memories when no filters', async () => {
    const request: ListMemoriesRequest = {
      basePath: testDir,
    };

    const response = await listMemories(request);

    expect(response.status).toBe('success');
    expect(response.memories).toHaveLength(3);
  });

  it('should filter by type', async () => {
    const request: ListMemoriesRequest = {
      basePath: testDir,
      type: MemoryType.Decision,
    };

    const response = await listMemories(request);

    expect(response.status).toBe('success');
    expect(response.memories).toHaveLength(2);
    expect(response.memories?.every(m => m.type === MemoryType.Decision)).toBe(true);
  });

  it('should filter by tag', async () => {
    const request: ListMemoriesRequest = {
      basePath: testDir,
      tag: 'auth',
    };

    const response = await listMemories(request);

    expect(response.status).toBe('success');
    expect(response.memories).toHaveLength(1);
    expect(response.memories?.[0].tags).toContain('auth');
  });

  it('should filter by multiple tags (AND)', async () => {
    const request: ListMemoriesRequest = {
      basePath: testDir,
      tags: ['auth', 'security'],
    };

    const response = await listMemories(request);

    expect(response.status).toBe('success');
    expect(response.memories).toHaveLength(1);
  });

  it('should return empty array for no matches', async () => {
    const request: ListMemoriesRequest = {
      basePath: testDir,
      type: MemoryType.Hub,
    };

    const response = await listMemories(request);

    expect(response.status).toBe('success');
    expect(response.memories).toHaveLength(0);
  });

  it('should sort by date descending by default', async () => {
    const request: ListMemoriesRequest = {
      basePath: testDir,
    };

    const response = await listMemories(request);

    expect(response.status).toBe('success');
    // Most recently created should be first
    const dates = response.memories?.map(m => new Date(m.created).getTime()) ?? [];
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('should limit results', async () => {
    const request: ListMemoriesRequest = {
      basePath: testDir,
      limit: 2,
    };

    const response = await listMemories(request);

    expect(response.status).toBe('success');
    expect(response.memories).toHaveLength(2);
  });

  it('should include count in response', async () => {
    const request: ListMemoriesRequest = {
      basePath: testDir,
    };

    const response = await listMemories(request);

    expect(response.status).toBe('success');
    expect(response.count).toBe(3);
  });

  it('should sort by title ascending', async () => {
    const request: ListMemoriesRequest = {
      basePath: testDir,
      sortBy: 'title',
      sortOrder: 'asc',
    };

    const response = await listMemories(request);

    expect(response.status).toBe('success');
    const titles = response.memories?.map(m => m.title) ?? [];
    expect(titles).toEqual([...titles].sort());
  });

  it('should sort by updated date', async () => {
    const request: ListMemoriesRequest = {
      basePath: testDir,
      sortBy: 'updated',
      sortOrder: 'desc',
    };

    const response = await listMemories(request);

    expect(response.status).toBe('success');
    const dates = response.memories?.map(m => new Date(m.updated).getTime()) ?? [];
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('should return empty list for non-existent basePath', async () => {
    const request: ListMemoriesRequest = {
      basePath: '/non-existent-path-for-testing-12345',
    };

    const response = await listMemories(request);

    // Returns success with empty list for non-existent paths
    expect(response.status).toBe('success');
    expect(response.memories).toHaveLength(0);
  });

  it('should filter by scope', async () => {
    const request: ListMemoriesRequest = {
      basePath: testDir,
      scope: Scope.Global,
    };

    const response = await listMemories(request);

    expect(response.status).toBe('success');
    expect(response.memories?.every(m => m.scope === Scope.Global)).toBe(true);
  });
});
