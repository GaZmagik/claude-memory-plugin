/**
 * Unit tests for bulk link operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bulkLink } from './bulk-link.js';
import { MemoryType, Scope } from '../types/enums.js';
import * as indexModule from '../core/index.js';
import * as linkModule from '../graph/link.js';

describe('bulkLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when target is missing', async () => {
    const result = await bulkLink({ target: '', sourcePattern: 'decision-*' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('target is required');
  });

  it('should return error when no source specifier provided', async () => {
    const result = await bulkLink({ target: 'hub-decisions' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('Either sourcePattern or sourceIds is required');
  });

  it('should return empty result when no sources match pattern', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    const result = await bulkLink({
      target: 'hub-decisions',
      sourcePattern: 'decision-*',
    });

    expect(result.status).toBe('success');
    expect(result.createdCount).toBe(0);
    expect(result.createdLinks).toEqual([]);
  });

  it('should link matching sources to target by pattern', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-auth',
          type: MemoryType.Decision,
          title: 'Auth',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-auth.md',
        },
        {
          id: 'decision-api',
          type: MemoryType.Decision,
          title: 'API',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-api.md',
        },
        {
          id: 'hub-decisions',
          type: MemoryType.Artifact,
          title: 'Decisions Hub',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/hub-decisions.md',
        },
      ],
    });

    vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({
      status: 'success',
      edge: { source: 'mock', target: 'mock', label: 'relates-to' },
      alreadyExists: false,
    });

    const result = await bulkLink({
      target: 'hub-decisions',
      sourcePattern: 'decision-*',
    });

    expect(result.status).toBe('success');
    expect(result.createdCount).toBe(2);
    expect(result.createdLinks).toHaveLength(2);
    expect(linkModule.linkMemories).toHaveBeenCalledTimes(2);
  });

  it('should link sources by explicit IDs', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({
      status: 'success',
      edge: { source: 'mock', target: 'mock', label: 'relates-to' },
      alreadyExists: false,
    });

    const result = await bulkLink({
      target: 'hub-decisions',
      sourceIds: ['decision-auth', 'decision-api'],
    });

    expect(result.status).toBe('success');
    expect(result.createdCount).toBe(2);
    expect(linkModule.linkMemories).toHaveBeenCalledTimes(2);
  });

  it('should exclude target from sources', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({
      status: 'success',
      edge: { source: 'mock', target: 'mock', label: 'relates-to' },
      alreadyExists: false,
    });

    const result = await bulkLink({
      target: 'hub-decisions',
      sourceIds: ['decision-auth', 'hub-decisions', 'decision-api'],
    });

    expect(result.status).toBe('success');
    expect(result.createdCount).toBe(2);
    expect(linkModule.linkMemories).toHaveBeenCalledTimes(2);
  });

  it('should use custom relation', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    const linkSpy = vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({
      status: 'success',
      edge: { source: 'mock', target: 'mock', label: 'contributes-to' },
      alreadyExists: false,
    });

    await bulkLink({
      target: 'hub-decisions',
      sourceIds: ['decision-auth'],
      relation: 'contributes-to',
    });

    expect(linkSpy).toHaveBeenCalledWith(
      expect.objectContaining({ relation: 'contributes-to' })
    );
  });

  it('should return matched links in dry run mode', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-auth',
          type: MemoryType.Decision,
          title: 'Auth',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-auth.md',
        },
      ],
    });

    const linkSpy = vi.spyOn(linkModule, 'linkMemories');

    const result = await bulkLink({
      target: 'hub-decisions',
      sourcePattern: 'decision-*',
      dryRun: true,
    });

    expect(result.status).toBe('success');
    expect(result.createdCount).toBe(1);
    expect(result.dryRun).toBe(true);
    expect(linkSpy).not.toHaveBeenCalled();
  });

  it('should count existing links', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    vi.spyOn(linkModule, 'linkMemories')
      .mockResolvedValueOnce({
        status: 'success',
        edge: { source: 'mock', target: 'mock', label: 'relates-to' },
        alreadyExists: false,
      })
      .mockResolvedValueOnce({
        status: 'success',
        edge: { source: 'mock', target: 'mock', label: 'relates-to' },
        alreadyExists: true,
      });

    const result = await bulkLink({
      target: 'hub-decisions',
      sourceIds: ['decision-new', 'decision-existing'],
    });

    expect(result.status).toBe('success');
    expect(result.createdCount).toBe(1);
    expect(result.existingCount).toBe(1);
  });

  it('should report failed links', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    vi.spyOn(linkModule, 'linkMemories')
      .mockResolvedValueOnce({
        status: 'success',
        edge: { source: 'mock', target: 'mock', label: 'relates-to' },
        alreadyExists: false,
      })
      .mockResolvedValueOnce({
        status: 'error',
        error: 'Target not found',
      });

    const result = await bulkLink({
      target: 'hub-decisions',
      sourceIds: ['decision-good', 'decision-bad'],
    });

    expect(result.status).toBe('success');
    expect(result.createdCount).toBe(1);
    expect(result.failedLinks).toEqual([{ source: 'decision-bad', reason: 'Target not found' }]);
  });

  it('should call progress callback', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({
      status: 'success',
      edge: { source: 'mock', target: 'mock', label: 'relates-to' },
      alreadyExists: false,
    });

    const progressCalls: Array<{ current: number; total: number; phase: string }> = [];
    const onProgress = vi.fn((p) => progressCalls.push(p));

    await bulkLink({
      target: 'hub-decisions',
      sourceIds: ['decision-1', 'decision-2'],
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
    expect(progressCalls[0].phase).toBe('scanning');
    expect(progressCalls.some(p => p.phase === 'processing')).toBe(true);
    expect(progressCalls[progressCalls.length - 1].phase).toBe('complete');
  });
});
