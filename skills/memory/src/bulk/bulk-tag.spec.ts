/**
 * Unit tests for bulk tag operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bulkTag } from './bulk-tag.js';
import { MemoryType, Scope } from '../types/enums.js';
import * as indexModule from '../core/index.js';
import * as tagModule from '../core/tag.js';
import type { TagMemoryResponse, UntagMemoryResponse } from '../types/api.js';

/** Helper to create successful tag response */
const mockTagSuccess = (id: string, newTags: string[]): TagMemoryResponse => ({
  status: 'success',
  id,
  previousTags: [],
  newTags,
});

/** Helper to create successful untag response */
const mockUntagSuccess = (id: string, newTags: string[]): UntagMemoryResponse => ({
  status: 'success',
  id,
  previousTags: ['old'],
  newTags,
});

/** Standard test memories */
const testMemories = [
  {
    id: 'decision-foo',
    type: MemoryType.Decision,
    title: 'Foo',
    tags: ['existing'],
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    scope: Scope.Project,
    relativePath: 'permanent/decision-foo.md',
  },
  {
    id: 'decision-bar',
    type: MemoryType.Decision,
    title: 'Bar',
    tags: ['existing'],
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    scope: Scope.Project,
    relativePath: 'permanent/decision-bar.md',
  },
];

describe('bulkTag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when no filter criteria provided', async () => {
    const result = await bulkTag({ addTags: ['new'] });
    expect(result.status).toBe('error');
    expect(result.error).toContain('At least one filter criteria');
  });

  it('should return error when no tag operation specified', async () => {
    const result = await bulkTag({ pattern: 'decision-*' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('addTags or removeTags');
  });

  it('should return empty result when no memories match', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    const result = await bulkTag({ pattern: 'decision-*', addTags: ['new'] });
    expect(result.status).toBe('success');
    expect(result.modifiedCount).toBe(0);
  });

  it('should add tags to matching memories', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    vi.spyOn(tagModule, 'tagMemory').mockResolvedValue(mockTagSuccess('test', ['new']));

    const result = await bulkTag({ pattern: 'decision-*', addTags: ['new'] });

    expect(result.status).toBe('success');
    expect(result.modifiedCount).toBe(2);
    expect(result.modifiedIds).toEqual(['decision-foo', 'decision-bar']);
    expect(tagModule.tagMemory).toHaveBeenCalledTimes(2);
  });

  it('should remove tags from matching memories', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    vi.spyOn(tagModule, 'untagMemory').mockResolvedValue(mockUntagSuccess('test', []));

    const result = await bulkTag({ pattern: 'decision-*', removeTags: ['existing'] });

    expect(result.status).toBe('success');
    expect(result.modifiedCount).toBe(2);
    expect(tagModule.untagMemory).toHaveBeenCalledTimes(2);
  });

  it('should add and remove tags in same operation', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [testMemories[0]],
    });
    vi.spyOn(tagModule, 'tagMemory').mockResolvedValue(mockTagSuccess('test', ['new']));
    vi.spyOn(tagModule, 'untagMemory').mockResolvedValue(mockUntagSuccess('test', []));

    const result = await bulkTag({
      pattern: 'decision-*',
      addTags: ['new'],
      removeTags: ['old'],
    });

    expect(result.status).toBe('success');
    expect(tagModule.tagMemory).toHaveBeenCalledTimes(1);
    expect(tagModule.untagMemory).toHaveBeenCalledTimes(1);
  });

  it('should return matched IDs in dry run mode', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    const tagSpy = vi.spyOn(tagModule, 'tagMemory');

    const result = await bulkTag({ pattern: 'decision-*', addTags: ['new'], dryRun: true });

    expect(result.status).toBe('success');
    expect(result.modifiedCount).toBe(2);
    expect(result.dryRun).toBe(true);
    expect(tagSpy).not.toHaveBeenCalled();
  });

  it('should report failed tag operations', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    vi.spyOn(tagModule, 'tagMemory')
      .mockResolvedValueOnce(mockTagSuccess('decision-foo', ['new']))
      .mockResolvedValueOnce({ status: 'error', error: 'File not found' });

    const result = await bulkTag({ pattern: 'decision-*', addTags: ['new'] });

    expect(result.modifiedCount).toBe(1);
    expect(result.failedIds).toEqual([{ id: 'decision-bar', reason: 'File not found' }]);
  });

  it('should call progress callback', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    vi.spyOn(tagModule, 'tagMemory').mockResolvedValue(mockTagSuccess('test', ['new']));

    const progressCalls: Array<{ phase: string }> = [];
    await bulkTag({
      pattern: 'decision-*',
      addTags: ['new'],
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
    vi.spyOn(tagModule, 'tagMemory').mockResolvedValue(mockTagSuccess('test', ['new']));

    const result = await bulkTag({
      pattern: 'decision-*',
      ids: ['decision-foo'], // Only tag this one, not decision-bar
      addTags: ['new'],
    });

    expect(result.status).toBe('success');
    expect(result.modifiedCount).toBe(1);
    expect(result.modifiedIds).toEqual(['decision-foo']);
    expect(tagModule.tagMemory).toHaveBeenCalledTimes(1);
  });

  it('should report failed untag after successful tag', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [testMemories[0]],
    });
    vi.spyOn(tagModule, 'tagMemory').mockResolvedValue(mockTagSuccess('decision-foo', ['new']));
    vi.spyOn(tagModule, 'untagMemory').mockResolvedValue({
      status: 'error',
      error: 'Tag not found',
    });

    const result = await bulkTag({
      pattern: 'decision-*',
      addTags: ['new'],
      removeTags: ['old'],
    });

    expect(result.status).toBe('success');
    expect(result.modifiedCount).toBe(0);
    expect(result.failedIds).toEqual([{ id: 'decision-foo', reason: 'Tag not found' }]);
  });

  it('should handle thrown exceptions during tag operation', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: testMemories,
    });
    vi.spyOn(tagModule, 'tagMemory')
      .mockResolvedValueOnce(mockTagSuccess('decision-foo', ['new']))
      .mockRejectedValueOnce(new Error('Network failure'));

    const result = await bulkTag({ pattern: 'decision-*', addTags: ['new'] });

    expect(result.status).toBe('success');
    expect(result.modifiedCount).toBe(1);
    expect(result.failedIds).toEqual([{ id: 'decision-bar', reason: 'Error: Network failure' }]);
  });

  it('should handle general errors in outer try block', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockRejectedValue(new Error('Index corrupted'));

    const result = await bulkTag({ pattern: 'decision-*', addTags: ['new'] });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Bulk tag failed');
    expect(result.error).toContain('Index corrupted');
  });
});
