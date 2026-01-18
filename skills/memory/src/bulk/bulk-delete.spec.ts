/**
 * Unit tests for bulk delete operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bulkDelete } from './bulk-delete.js';
import { MemoryType, Scope } from '../types/enums.js';
import { memoryId } from '../test-utils/branded-helpers.js';
import * as indexModule from '../core/index.js';
import * as fsUtils from '../core/fs-utils.js';

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
          id: memoryId('decision-foo'),
          type: MemoryType.Decision,
          title: 'Foo Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: memoryId('decision-bar'),
          type: MemoryType.Decision,
          title: 'Bar Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-bar.md',
        },
        {
          id: memoryId('learning-baz'),
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

    vi.spyOn(fsUtils, 'isInsideDir').mockReturnValue(true);
    vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
    vi.spyOn(fsUtils, 'deleteFile').mockResolvedValue(undefined);
    vi.spyOn(indexModule, 'batchRemoveFromIndex').mockResolvedValue(2);

    const result = await bulkDelete({ pattern: 'decision-*' });

    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(2);
    expect(result.deletedIds).toEqual(['decision-foo', 'decision-bar']);
    expect(fsUtils.deleteFile).toHaveBeenCalledTimes(2);
  });

  it('should filter by tags', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('decision-auth'),
          type: MemoryType.Decision,
          title: 'Auth Decision',
          tags: ['auth', 'security'],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-auth.md',
        },
        {
          id: memoryId('decision-api'),
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

    vi.spyOn(fsUtils, 'isInsideDir').mockReturnValue(true);
    vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
    vi.spyOn(fsUtils, 'deleteFile').mockResolvedValue(undefined);
    vi.spyOn(indexModule, 'batchRemoveFromIndex').mockResolvedValue(1);

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
          id: memoryId('decision-foo'),
          type: MemoryType.Decision,
          title: 'Foo Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: memoryId('learning-bar'),
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

    vi.spyOn(fsUtils, 'isInsideDir').mockReturnValue(true);
    vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
    vi.spyOn(fsUtils, 'deleteFile').mockResolvedValue(undefined);
    vi.spyOn(indexModule, 'batchRemoveFromIndex').mockResolvedValue(1);

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
          id: memoryId('decision-global'),
          type: MemoryType.Decision,
          title: 'Global Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-global.md',
        },
        {
          id: memoryId('decision-project'),
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

    vi.spyOn(fsUtils, 'isInsideDir').mockReturnValue(true);
    vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
    vi.spyOn(fsUtils, 'deleteFile').mockResolvedValue(undefined);
    vi.spyOn(indexModule, 'batchRemoveFromIndex').mockResolvedValue(1);

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
          id: memoryId('decision-foo'),
          type: MemoryType.Decision,
          title: 'Foo Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: memoryId('decision-bar'),
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

    const deleteFileSpy = vi.spyOn(fsUtils, 'deleteFile');

    const result = await bulkDelete({ pattern: 'decision-*', dryRun: true });

    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(2);
    expect(result.deletedIds).toEqual(['decision-foo', 'decision-bar']);
    expect(result.dryRun).toBe(true);
    expect(deleteFileSpy).not.toHaveBeenCalled();
  });

  it('should report failed deletions', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('decision-foo'),
          type: MemoryType.Decision,
          title: 'Foo Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: memoryId('decision-bar'),
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

    vi.spyOn(fsUtils, 'isInsideDir').mockReturnValue(true);
    vi.spyOn(fsUtils, 'fileExists')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false); // Second file not found
    vi.spyOn(fsUtils, 'deleteFile').mockResolvedValue(undefined);
    vi.spyOn(indexModule, 'batchRemoveFromIndex').mockResolvedValue(1);

    const result = await bulkDelete({ pattern: 'decision-*' });

    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(1);
    expect(result.deletedIds).toEqual(['decision-foo']);
    expect(result.failedIds).toEqual([{ id: memoryId('decision-bar'), reason: 'File not found' }]);
  });

  it('should call progress callback', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('decision-foo'),
          type: MemoryType.Decision,
          title: 'Foo',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: memoryId('decision-bar'),
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

    vi.spyOn(fsUtils, 'isInsideDir').mockReturnValue(true);
    vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
    vi.spyOn(fsUtils, 'deleteFile').mockResolvedValue(undefined);
    vi.spyOn(indexModule, 'batchRemoveFromIndex').mockResolvedValue(2);

    const progressCalls: Array<{ current: number; total: number; phase: string }> = [];
    const onProgress = vi.fn((p) => progressCalls.push(p));

    await bulkDelete({ pattern: 'decision-*', onProgress });

    expect(onProgress).toHaveBeenCalled();
    expect(progressCalls[0]!.phase).toBe('scanning');
    expect(progressCalls.some(p => p.phase === 'processing')).toBe(true);
    expect(progressCalls[progressCalls.length - 1]!.phase).toBe('complete');
  });

  it('should combine multiple filters', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('decision-auth-v1'),
          type: MemoryType.Decision,
          title: 'Auth V1',
          tags: ['auth', 'deprecated'],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-auth-v1.md',
        },
        {
          id: memoryId('decision-auth-v2'),
          type: MemoryType.Decision,
          title: 'Auth V2',
          tags: ['auth'],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-auth-v2.md',
        },
        {
          id: memoryId('learning-deprecated'),
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

    vi.spyOn(fsUtils, 'isInsideDir').mockReturnValue(true);
    vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
    vi.spyOn(fsUtils, 'deleteFile').mockResolvedValue(undefined);
    vi.spyOn(indexModule, 'batchRemoveFromIndex').mockResolvedValue(1);

    const result = await bulkDelete({
      pattern: 'decision-*',
      tags: ['deprecated'],
    });

    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(1);
    expect(result.deletedIds).toEqual(['decision-auth-v1']);
  });

  it('should reject path traversal attempts', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('decision-malicious'),
          type: MemoryType.Decision,
          title: 'Malicious',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: '../../../etc/passwd',
        },
      ],
    });

    vi.spyOn(fsUtils, 'isInsideDir').mockReturnValue(false); // Path traversal detected

    const result = await bulkDelete({ pattern: 'decision-*' });

    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(0);
    expect(result.failedIds).toEqual([{ id: memoryId('decision-malicious'), reason: 'Path traversal not allowed' }]);
  });

  it('should handle thrown exceptions during file deletion', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('decision-foo'),
          type: MemoryType.Decision,
          title: 'Foo',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: memoryId('decision-bar'),
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

    vi.spyOn(fsUtils, 'isInsideDir').mockReturnValue(true);
    vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
    vi.spyOn(fsUtils, 'deleteFile')
      .mockResolvedValueOnce(undefined) // First succeeds
      .mockImplementationOnce(async () => { throw new Error('Permission denied'); }); // Second throws
    vi.spyOn(indexModule, 'batchRemoveFromIndex').mockResolvedValue(1);

    const result = await bulkDelete({ pattern: 'decision-*' });

    expect(result.status).toBe('success');
    expect(result.deletedCount).toBe(1);
    expect(result.failedIds).toEqual([{ id: memoryId('decision-bar'), reason: 'Error: Permission denied' }]);
  });

  it('should handle general errors in outer try block', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockRejectedValue(new Error('Index corrupted'));

    const result = await bulkDelete({ pattern: 'decision-*' });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Bulk delete failed');
    expect(result.error).toContain('Index corrupted');
  });
});
