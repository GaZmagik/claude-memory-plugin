/**
 * Unit tests for bulk delete operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bulkDelete } from './bulk-delete.js';
import { MemoryType, Scope } from '../types/enums.js';
import * as indexModule from '../core/index.js';
import * as deleteModule from '../core/delete.js';

describe('bulkDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when no filter criteria provided', async () => {
    const result = await bulkDelete({});
    expect(result.status).toBe('error');
    expect(result.error).toContain('At least one filter criteria is required');
  });

  it('should return empty result when no memories match', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    const result = await bulkDelete({ pattern: 'decision-*' });
    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(0);
    expect(result.deletedIds).toEqual([]);
  });

  it('should delete matching memories by pattern', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-foo',
          type: MemoryType.Decision,
          title: 'Foo Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: 'decision-bar',
          type: MemoryType.Decision,
          title: 'Bar Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-bar.md',
        },
        {
          id: 'learning-baz',
          type: MemoryType.Learning,
          title: 'Baz Learning',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/learning-baz.md',
        },
      ],
    });

    vi.spyOn(deleteModule, 'deleteMemory').mockResolvedValue({
      status: 'success',
      deletedId: 'mock-id',
    });

    const result = await bulkDelete({ pattern: 'decision-*' });

    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(2);
    expect(result.deletedIds).toEqual(['decision-foo', 'decision-bar']);
    expect(deleteModule.deleteMemory).toHaveBeenCalledTimes(2);
  });

  it('should filter by tags', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-auth',
          type: MemoryType.Decision,
          title: 'Auth Decision',
          tags: ['auth', 'security'],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-auth.md',
        },
        {
          id: 'decision-api',
          type: MemoryType.Decision,
          title: 'API Decision',
          tags: ['api'],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-api.md',
        },
      ],
    });

    vi.spyOn(deleteModule, 'deleteMemory').mockResolvedValue({
      status: 'success',
      deletedId: 'mock-id',
    });

    const result = await bulkDelete({ tags: ['auth'] });

    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(1);
    expect(result.deletedIds).toEqual(['decision-auth']);
  });

  it('should filter by type', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-foo',
          type: MemoryType.Decision,
          title: 'Foo Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: 'learning-bar',
          type: MemoryType.Learning,
          title: 'Bar Learning',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/learning-bar.md',
        },
      ],
    });

    vi.spyOn(deleteModule, 'deleteMemory').mockResolvedValue({
      status: 'success',
      deletedId: 'mock-id',
    });

    const result = await bulkDelete({ type: MemoryType.Learning });

    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(1);
    expect(result.deletedIds).toEqual(['learning-bar']);
  });

  it('should filter by scope', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-global',
          type: MemoryType.Decision,
          title: 'Global Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-global.md',
        },
        {
          id: 'decision-project',
          type: MemoryType.Decision,
          title: 'Project Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/decision-project.md',
        },
      ],
    });

    vi.spyOn(deleteModule, 'deleteMemory').mockResolvedValue({
      status: 'success',
      deletedId: 'mock-id',
    });

    const result = await bulkDelete({ scope: Scope.Project });

    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(1);
    expect(result.deletedIds).toEqual(['decision-project']);
  });

  it('should return matched IDs in dry run mode', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-foo',
          type: MemoryType.Decision,
          title: 'Foo Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: 'decision-bar',
          type: MemoryType.Decision,
          title: 'Bar Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-bar.md',
        },
      ],
    });

    const deleteMemorySpy = vi.spyOn(deleteModule, 'deleteMemory');

    const result = await bulkDelete({ pattern: 'decision-*', dryRun: true });

    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(2);
    expect(result.deletedIds).toEqual(['decision-foo', 'decision-bar']);
    expect(result.dryRun).toBe(true);
    expect(deleteMemorySpy).not.toHaveBeenCalled();
  });

  it('should report failed deletions', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-foo',
          type: MemoryType.Decision,
          title: 'Foo Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: 'decision-bar',
          type: MemoryType.Decision,
          title: 'Bar Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-bar.md',
        },
      ],
    });

    vi.spyOn(deleteModule, 'deleteMemory')
      .mockResolvedValueOnce({ status: 'success', deletedId: 'decision-foo' })
      .mockResolvedValueOnce({ status: 'error', error: 'File not found' });

    const result = await bulkDelete({ pattern: 'decision-*' });

    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(1);
    expect(result.deletedIds).toEqual(['decision-foo']);
    expect(result.failedIds).toEqual([{ id: 'decision-bar', reason: 'File not found' }]);
  });

  it('should call progress callback', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-foo',
          type: MemoryType.Decision,
          title: 'Foo',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: 'decision-bar',
          type: MemoryType.Decision,
          title: 'Bar',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-bar.md',
        },
      ],
    });

    vi.spyOn(deleteModule, 'deleteMemory').mockResolvedValue({
      status: 'success',
      deletedId: 'mock-id',
    });

    const progressCalls: Array<{ current: number; total: number; phase: string }> = [];
    const onProgress = vi.fn((p) => progressCalls.push(p));

    await bulkDelete({ pattern: 'decision-*', onProgress });

    expect(onProgress).toHaveBeenCalled();
    expect(progressCalls[0].phase).toBe('scanning');
    expect(progressCalls.some(p => p.phase === 'processing')).toBe(true);
    expect(progressCalls[progressCalls.length - 1].phase).toBe('complete');
  });

  it('should combine multiple filters', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-auth-v1',
          type: MemoryType.Decision,
          title: 'Auth V1',
          tags: ['auth', 'deprecated'],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-auth-v1.md',
        },
        {
          id: 'decision-auth-v2',
          type: MemoryType.Decision,
          title: 'Auth V2',
          tags: ['auth'],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-auth-v2.md',
        },
        {
          id: 'learning-deprecated',
          type: MemoryType.Learning,
          title: 'Deprecated Thing',
          tags: ['deprecated'],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/learning-deprecated.md',
        },
      ],
    });

    vi.spyOn(deleteModule, 'deleteMemory').mockResolvedValue({
      status: 'success',
      deletedId: 'mock-id',
    });

    const result = await bulkDelete({
      pattern: 'decision-*',
      tags: ['deprecated'],
    });

    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(1);
    expect(result.deletedIds).toEqual(['decision-auth-v1']);
  });
});
