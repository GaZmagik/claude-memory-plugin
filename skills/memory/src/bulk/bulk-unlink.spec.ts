/**
 * Unit tests for bulk unlink operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bulkUnlink } from './bulk-unlink.js';
import { MemoryType, Scope } from '../types/enums.js';
import * as indexModule from '../core/index.js';
import * as linkModule from '../graph/link.js';
import type { UnlinkMemoriesResponse } from '../types/operations.js';

/** Helper to create successful unlink response */
const mockUnlinkSuccess = (): UnlinkMemoriesResponse => ({
  status: 'success',
  removedCount: 1,
});

/** Standard test memories */
const testMemories = [
  {
    id: 'decision-foo',
    type: MemoryType.Decision,
    title: 'Foo',
    tags: [],
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    scope: Scope.Project,
    relativePath: 'permanent/decision-foo.md',
  },
  {
    id: 'decision-bar',
    type: MemoryType.Decision,
    title: 'Bar',
    tags: [],
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    scope: Scope.Project,
    relativePath: 'permanent/decision-bar.md',
  },
];

describe('bulkUnlink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when no filter criteria provided', async () => {
    const result = await bulkUnlink({ target: 'hub-main' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('At least one filter criteria');
  });

  it('should return error when target is missing', async () => {
    const result = await bulkUnlink({ pattern: 'decision-*' } as any);
    expect(result.status).toBe('error');
    expect(result.error).toContain('target');
  });

  it('should return empty result when no memories match', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    const result = await bulkUnlink({ pattern: 'decision-*', target: 'hub-main' });
    expect(result.status).toBe('success');
    expect(result.unlinkedCount).toBe(0);
  });

  it('should unlink matching memories from target', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    vi.spyOn(linkModule, 'unlinkMemories').mockResolvedValue(mockUnlinkSuccess());

    const result = await bulkUnlink({ pattern: 'decision-*', target: 'hub-main' });

    expect(result.status).toBe('success');
    expect(result.unlinkedCount).toBe(2);
    expect(result.unlinkedPairs).toEqual([
      { source: 'decision-foo', target: 'hub-main' },
      { source: 'decision-bar', target: 'hub-main' },
    ]);
    expect(linkModule.unlinkMemories).toHaveBeenCalledTimes(2);
  });

  it('should pass relation to unlink operation', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [testMemories[0]],
    });
    vi.spyOn(linkModule, 'unlinkMemories').mockResolvedValue(mockUnlinkSuccess());

    await bulkUnlink({
      pattern: 'decision-*',
      target: 'hub-main',
      relation: 'relates-to',
    });

    expect(linkModule.unlinkMemories).toHaveBeenCalledWith(
      expect.objectContaining({ relation: 'relates-to' })
    );
  });

  it('should return matched pairs in dry run mode', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    const unlinkSpy = vi.spyOn(linkModule, 'unlinkMemories');

    const result = await bulkUnlink({
      pattern: 'decision-*',
      target: 'hub-main',
      dryRun: true,
    });

    expect(result.status).toBe('success');
    expect(result.unlinkedCount).toBe(2);
    expect(result.dryRun).toBe(true);
    expect(unlinkSpy).not.toHaveBeenCalled();
  });

  it('should report failed unlink operations', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    vi.spyOn(linkModule, 'unlinkMemories')
      .mockResolvedValueOnce(mockUnlinkSuccess())
      .mockResolvedValueOnce({ status: 'error', error: 'Edge not found' });

    const result = await bulkUnlink({ pattern: 'decision-*', target: 'hub-main' });

    expect(result.unlinkedCount).toBe(1);
    expect(result.failedIds).toEqual([{ id: 'decision-bar', reason: 'Edge not found' }]);
  });

  it('should call progress callback', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    vi.spyOn(linkModule, 'unlinkMemories').mockResolvedValue(mockUnlinkSuccess());

    const progressCalls: Array<{ phase: string }> = [];
    await bulkUnlink({
      pattern: 'decision-*',
      target: 'hub-main',
      onProgress: (p: { phase: string }) => progressCalls.push(p),
    });

    expect(progressCalls[0].phase).toBe('scanning');
    expect(progressCalls.some((p) => p.phase === 'processing')).toBe(true);
    expect(progressCalls[progressCalls.length - 1].phase).toBe('complete');
  });
});
