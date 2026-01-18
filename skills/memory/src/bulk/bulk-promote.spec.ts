/**
 * Unit tests for bulk promote operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memoryId } from '../test-utils/branded-helpers.js';
import { bulkPromote } from './bulk-promote.js';
import { MemoryType, Scope } from '../types/enums.js';
import * as indexModule from '../core/index.js';
import * as promoteModule from '../maintenance/promote.js';
import type { PromoteResponse } from '../maintenance/promote.js';

/** Helper to create successful promote response */
const mockPromoteSuccess = (id: string, toType: MemoryType): PromoteResponse => ({
  status: 'success',
  id,
  fromType: MemoryType.Learning,
  toType,
  changes: {
    frontmatterUpdated: true,
    fileMoved: true,
    graphUpdated: true,
    indexUpdated: true,
    fileRenamed: false,
  },
});

/** Standard test memories */
const testMemories = [
  {
    id: memoryId('learning-foo'),
    type: MemoryType.Learning,
    title: 'Foo',
    tags: [],
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    scope: Scope.Project,
    relativePath: 'permanent/learning-foo.md',
  },
  {
    id: memoryId('learning-bar'),
    type: MemoryType.Learning,
    title: 'Bar',
    tags: [],
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    scope: Scope.Project,
    relativePath: 'permanent/learning-bar.md',
  },
];

describe('bulkPromote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when no filter criteria provided', async () => {
    const result = await bulkPromote({ targetType: MemoryType.Decision });
    expect(result.status).toBe('error');
    expect(result.error).toContain('At least one filter criteria');
  });

  it('should return error when targetType is missing', async () => {
    const result = await bulkPromote({ pattern: 'learning-*' } as any);
    expect(result.status).toBe('error');
    expect(result.error).toContain('targetType');
  });

  it('should return empty result when no memories match', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    const result = await bulkPromote({
      pattern: 'learning-*',
      targetType: MemoryType.Decision,
    });
    expect(result.status).toBe('success');
    expect(result.promotedCount).toBe(0);
  });

  it('should promote matching memories to target type', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    vi.spyOn(promoteModule, 'promoteMemory').mockResolvedValue(
      mockPromoteSuccess('learning-foo', MemoryType.Decision)
    );

    const result = await bulkPromote({
      pattern: 'learning-*',
      targetType: MemoryType.Decision,
    });

    expect(result.status).toBe('success');
    expect(result.promotedCount).toBe(2);
    expect(result.promotedIds).toEqual(['learning-foo', 'learning-bar']);
    expect(promoteModule.promoteMemory).toHaveBeenCalledTimes(2);
  });

  it('should skip memories already of target type', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        testMemories[0],
        {
          ...testMemories[1],
          id: memoryId('decision-bar'),
          type: MemoryType.Decision,
        },
      ],
    });
    vi.spyOn(promoteModule, 'promoteMemory').mockResolvedValue(
      mockPromoteSuccess('learning-foo', MemoryType.Decision)
    );

    const result = await bulkPromote({
      pattern: '*-*',
      targetType: MemoryType.Decision,
    });

    expect(result.promotedCount).toBe(1);
    expect(promoteModule.promoteMemory).toHaveBeenCalledTimes(1);
  });

  it('should return matched IDs in dry run mode', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    const promoteSpy = vi.spyOn(promoteModule, 'promoteMemory');

    const result = await bulkPromote({
      pattern: 'learning-*',
      targetType: MemoryType.Decision,
      dryRun: true,
    });

    expect(result.status).toBe('success');
    expect(result.promotedCount).toBe(2);
    expect(result.dryRun).toBe(true);
    expect(promoteSpy).not.toHaveBeenCalled();
  });

  it('should report failed promote operations', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    vi.spyOn(promoteModule, 'promoteMemory')
      .mockResolvedValueOnce(mockPromoteSuccess('learning-foo', MemoryType.Decision))
      .mockResolvedValueOnce({
        status: 'error',
        id: memoryId('learning-bar'),
        toType: MemoryType.Decision,
        changes: {
          frontmatterUpdated: false,
          fileMoved: false,
          graphUpdated: false,
          indexUpdated: false,
          fileRenamed: false,
        },
        error: 'File not found',
      });

    const result = await bulkPromote({
      pattern: 'learning-*',
      targetType: MemoryType.Decision,
    });

    expect(result.promotedCount).toBe(1);
    expect(result.failedIds).toEqual([{ id: memoryId('learning-bar'), reason: 'File not found' }]);
  });

  it('should call progress callback', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    vi.spyOn(promoteModule, 'promoteMemory').mockResolvedValue(
      mockPromoteSuccess('test', MemoryType.Decision)
    );

    const progressCalls: Array<{ phase: string }> = [];
    await bulkPromote({
      pattern: 'learning-*',
      targetType: MemoryType.Decision,
      onProgress: (p: { phase: string }) => progressCalls.push(p),
    });

    expect(progressCalls[0].phase).toBe('scanning');
    expect(progressCalls.some((p) => p.phase === 'processing')).toBe(true);
    expect(progressCalls[progressCalls.length - 1].phase).toBe('complete');
  });

  it('should filter by explicit IDs when provided', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    vi.spyOn(promoteModule, 'promoteMemory').mockResolvedValue(
      mockPromoteSuccess('learning-foo', MemoryType.Decision)
    );

    const result = await bulkPromote({
      pattern: 'learning-*',
      ids: ['learning-foo'], // Only promote this one, not learning-bar
      targetType: MemoryType.Decision,
    });

    expect(result.status).toBe('success');
    expect(result.promotedCount).toBe(1);
    expect(result.promotedIds).toEqual(['learning-foo']);
    expect(promoteModule.promoteMemory).toHaveBeenCalledTimes(1);
  });

  it('should handle thrown exceptions during promote operation', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    vi.spyOn(promoteModule, 'promoteMemory')
      .mockResolvedValueOnce(mockPromoteSuccess('learning-foo', MemoryType.Decision))
      .mockRejectedValueOnce(new Error('Network failure'));

    const result = await bulkPromote({
      pattern: 'learning-*',
      targetType: MemoryType.Decision,
    });

    expect(result.status).toBe('success');
    expect(result.promotedCount).toBe(1);
    expect(result.failedIds).toEqual([{ id: memoryId('learning-bar'), reason: 'Error: Network failure' }]);
  });

  it('should handle general errors in outer try block', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockRejectedValue(new Error('Index corrupted'));

    const result = await bulkPromote({
      pattern: 'learning-*',
      targetType: MemoryType.Decision,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Bulk promote failed');
    expect(result.error).toContain('Index corrupted');
  });
});
