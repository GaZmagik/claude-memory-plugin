/**
 * Unit tests for bulk move operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bulkMove } from './bulk-move.js';
import { MemoryType, Scope } from '../types/enums.js';
import * as indexModule from '../core/index.js';
import * as moveModule from '../maintenance/move.js';
import type { MoveResponse } from '../maintenance/move.js';
import { memoryId } from '../test-utils/branded-helpers.js';

/** Helper to create successful move response */
const mockMoveSuccess = (id: string): MoveResponse => ({
  status: 'success',
  id,
  changes: {
    fileMoved: true,
    sourceGraphUpdated: true,
    targetGraphUpdated: true,
    sourceIndexUpdated: true,
    targetIndexUpdated: true,
    embeddingsTransferred: true,
  },
});

/** Helper to create error move response */
const mockMoveError = (id: string, error: string): MoveResponse => ({
  status: 'error',
  id,
  error,
  changes: {
    fileMoved: false,
    sourceGraphUpdated: false,
    targetGraphUpdated: false,
    sourceIndexUpdated: false,
    targetIndexUpdated: false,
    embeddingsTransferred: false,
  },
});

describe('bulkMove', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when no filter criteria provided', async () => {
    const result = await bulkMove({
      targetScope: Scope.Local,
    });
    expect(result.status).toBe('error');
    expect(result.error).toContain('At least one filter criteria is required');
  });

  it('should return error when targetScope is missing', async () => {
    const result = await bulkMove({
      pattern: 'decision-*',
    } as any);
    expect(result.status).toBe('error');
    expect(result.error).toContain('targetScope');
  });

  it('should return empty result when no memories match', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    const result = await bulkMove({
      pattern: 'decision-*',
      targetScope: Scope.Local,
    });
    expect(result.status).toBe('success');
    expect(result.movedCount).toBe(0);
    expect(result.movedIds).toEqual([]);
  });

  it('should move matching memories by pattern', async () => {
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
          scope: Scope.Project,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: memoryId('decision-bar'),
          type: MemoryType.Decision,
          title: 'Bar Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/decision-bar.md',
        },
        {
          id: memoryId('learning-baz'),
          type: MemoryType.Learning,
          title: 'Baz Learning',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/learning-baz.md',
        },
      ],
    });

    vi.spyOn(moveModule, 'moveMemory').mockResolvedValue({
      status: 'success',
      id: memoryId('decision-foo'),
      changes: {
        fileMoved: true,
        sourceGraphUpdated: true,
        targetGraphUpdated: true,
        sourceIndexUpdated: true,
        targetIndexUpdated: true,
        embeddingsTransferred: true,
      },
    });

    const result = await bulkMove({
      pattern: 'decision-*',
      targetScope: Scope.Local,
    });

    expect(result.status).toBe('success');
    expect(result.movedCount).toBe(2);
    expect(result.movedIds).toEqual(['decision-foo', 'decision-bar']);
    expect(moveModule.moveMemory).toHaveBeenCalledTimes(2);
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
          scope: Scope.Project,
          relativePath: 'permanent/decision-auth.md',
        },
        {
          id: memoryId('decision-api'),
          type: MemoryType.Decision,
          title: 'API Decision',
          tags: ['api'],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/decision-api.md',
        },
      ],
    });

    vi.spyOn(moveModule, 'moveMemory').mockResolvedValue(mockMoveSuccess('decision-auth'));

    const result = await bulkMove({
      tags: ['auth'],
      targetScope: Scope.Local,
    });

    expect(result.status).toBe('success');
    expect(result.movedCount).toBe(1);
    expect(result.movedIds).toEqual(['decision-auth']);
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
          scope: Scope.Project,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: memoryId('learning-bar'),
          type: MemoryType.Learning,
          title: 'Bar Learning',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/learning-bar.md',
        },
      ],
    });

    vi.spyOn(moveModule, 'moveMemory').mockResolvedValue(mockMoveSuccess('learning-bar'));

    const result = await bulkMove({
      type: MemoryType.Learning,
      targetScope: Scope.Local,
    });

    expect(result.status).toBe('success');
    expect(result.movedCount).toBe(1);
    expect(result.movedIds).toEqual(['learning-bar']);
  });

  it('should filter by sourceScope', async () => {
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

    vi.spyOn(moveModule, 'moveMemory').mockResolvedValue(mockMoveSuccess('decision-project'));

    const result = await bulkMove({
      sourceScope: Scope.Project,
      targetScope: Scope.Local,
    });

    expect(result.status).toBe('success');
    expect(result.movedCount).toBe(1);
    expect(result.movedIds).toEqual(['decision-project']);
  });

  it('should skip memories already in target scope', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('decision-already-local'),
          type: MemoryType.Decision,
          title: 'Already Local',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Local,
          relativePath: 'permanent/decision-already-local.md',
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

    vi.spyOn(moveModule, 'moveMemory').mockResolvedValue(mockMoveSuccess('decision-project'));

    const result = await bulkMove({
      pattern: 'decision-*',
      targetScope: Scope.Local,
    });

    expect(result.status).toBe('success');
    expect(result.movedCount).toBe(1);
    expect(result.movedIds).toEqual(['decision-project']);
    expect(moveModule.moveMemory).toHaveBeenCalledTimes(1);
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
          scope: Scope.Project,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: memoryId('decision-bar'),
          type: MemoryType.Decision,
          title: 'Bar Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/decision-bar.md',
        },
      ],
    });

    const moveMemorySpy = vi.spyOn(moveModule, 'moveMemory');

    const result = await bulkMove({
      pattern: 'decision-*',
      targetScope: Scope.Local,
      dryRun: true,
    });

    expect(result.status).toBe('success');
    expect(result.movedCount).toBe(2);
    expect(result.movedIds).toEqual(['decision-foo', 'decision-bar']);
    expect(result.dryRun).toBe(true);
    expect(moveMemorySpy).not.toHaveBeenCalled();
  });

  it('should report failed moves', async () => {
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
          scope: Scope.Project,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: memoryId('decision-bar'),
          type: MemoryType.Decision,
          title: 'Bar Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/decision-bar.md',
        },
      ],
    });

    vi.spyOn(moveModule, 'moveMemory')
      .mockResolvedValueOnce(mockMoveSuccess('decision-foo'))
      .mockResolvedValueOnce(mockMoveError('decision-bar', 'Target file already exists'));

    const result = await bulkMove({
      pattern: 'decision-*',
      targetScope: Scope.Local,
    });

    expect(result.status).toBe('success');
    expect(result.movedCount).toBe(1);
    expect(result.movedIds).toEqual(['decision-foo']);
    expect(result.failedIds).toEqual([
      { id: memoryId('decision-bar'), reason: 'Target file already exists' },
    ]);
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
          scope: Scope.Project,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: memoryId('decision-bar'),
          type: MemoryType.Decision,
          title: 'Bar',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/decision-bar.md',
        },
      ],
    });

    vi.spyOn(moveModule, 'moveMemory').mockResolvedValue(mockMoveSuccess('test'));

    const progressCalls: Array<{ current: number; total: number; phase: string }> = [];
    const onProgress = vi.fn((p) => progressCalls.push(p));

    await bulkMove({
      pattern: 'decision-*',
      targetScope: Scope.Local,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
    expect(progressCalls[0].phase).toBe('scanning');
    expect(progressCalls.some((p) => p.phase === 'processing')).toBe(true);
    expect(progressCalls[progressCalls.length - 1].phase).toBe('complete');
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
          scope: Scope.Project,
          relativePath: 'permanent/decision-auth-v1.md',
        },
        {
          id: memoryId('decision-auth-v2'),
          type: MemoryType.Decision,
          title: 'Auth V2',
          tags: ['auth'],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/decision-auth-v2.md',
        },
        {
          id: memoryId('learning-deprecated'),
          type: MemoryType.Learning,
          title: 'Deprecated Thing',
          tags: ['deprecated'],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/learning-deprecated.md',
        },
      ],
    });

    vi.spyOn(moveModule, 'moveMemory').mockResolvedValue(mockMoveSuccess('decision-auth-v1'));

    const result = await bulkMove({
      pattern: 'decision-*',
      tags: ['deprecated'],
      targetScope: Scope.Local,
    });

    expect(result.status).toBe('success');
    expect(result.movedCount).toBe(1);
    expect(result.movedIds).toEqual(['decision-auth-v1']);
  });

  it('should use explicit IDs when provided', async () => {
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
          scope: Scope.Project,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: memoryId('decision-bar'),
          type: MemoryType.Decision,
          title: 'Bar Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/decision-bar.md',
        },
        {
          id: memoryId('decision-baz'),
          type: MemoryType.Decision,
          title: 'Baz Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/decision-baz.md',
        },
      ],
    });

    vi.spyOn(moveModule, 'moveMemory').mockResolvedValue(mockMoveSuccess('test'));

    const result = await bulkMove({
      ids: ['decision-foo', 'decision-baz'],
      targetScope: Scope.Local,
    });

    expect(result.status).toBe('success');
    expect(result.movedCount).toBe(2);
    expect(result.movedIds).toEqual(['decision-foo', 'decision-baz']);
    expect(moveModule.moveMemory).toHaveBeenCalledTimes(2);
  });

  it('should handle thrown exceptions during move operation', async () => {
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
          scope: Scope.Project,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: memoryId('decision-bar'),
          type: MemoryType.Decision,
          title: 'Bar',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/decision-bar.md',
        },
      ],
    });

    vi.spyOn(moveModule, 'moveMemory')
      .mockResolvedValueOnce(mockMoveSuccess('decision-foo'))
      .mockRejectedValueOnce(new Error('Network failure'));

    const result = await bulkMove({
      pattern: 'decision-*',
      targetScope: Scope.Local,
    });

    expect(result.status).toBe('success');
    expect(result.movedCount).toBe(1);
    expect(result.failedIds).toEqual([{ id: memoryId('decision-bar'), reason: 'Error: Network failure' }]);
  });

  it('should handle general errors in outer try block', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockRejectedValue(new Error('Index corrupted'));

    const result = await bulkMove({
      pattern: 'decision-*',
      targetScope: Scope.Local,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Bulk move failed');
    expect(result.error).toContain('Index corrupted');
  });
});
