/**
 * Unit tests for bulk link operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memoryId } from '../test-utils/branded-helpers.js';
import { bulkLink } from './bulk-link.js';
import { MemoryType, Scope } from '../types/enums.js';
import * as indexModule from '../core/index.js';
import * as structureModule from '../graph/structure.js';
import * as edgesModule from '../graph/edges.js';

// Helper to set up common mocks for graph operations
const setupGraphMocks = (hasEdgeResult = false) => {
  const mockGraph = { version: 1, nodes: [], edges: [] };
  vi.spyOn(structureModule, 'loadGraph').mockResolvedValue(mockGraph as any);
  vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined);
  vi.spyOn(structureModule, 'hasNode').mockReturnValue(false);
  vi.spyOn(structureModule, 'addNode').mockImplementation((g) => g);
  vi.spyOn(edgesModule, 'hasEdge').mockReturnValue(hasEdgeResult);
  vi.spyOn(edgesModule, 'addEdge').mockImplementation((g) => g);
};

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

  it('should return error when target not found', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    const result = await bulkLink({
      target: 'hub-decisions',
      sourcePattern: 'decision-*',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Target memory not found');
  });

  it('should return empty result when no sources match pattern', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('hub-decisions'),
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
    setupGraphMocks();

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
          id: memoryId('decision-auth'),
          type: MemoryType.Decision,
          title: 'Auth',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-auth.md',
        },
        {
          id: memoryId('decision-api'),
          type: MemoryType.Decision,
          title: 'API',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-api.md',
        },
        {
          id: memoryId('hub-decisions'),
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
    setupGraphMocks();

    const result = await bulkLink({
      target: 'hub-decisions',
      sourcePattern: 'decision-*',
    });

    expect(result.status).toBe('success');
    expect(result.createdCount).toBe(2);
    expect(result.createdLinks).toHaveLength(2);
    expect(edgesModule.addEdge).toHaveBeenCalledTimes(2);
  });

  it('should link sources by explicit IDs', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('decision-auth'),
          type: MemoryType.Decision,
          title: 'Auth',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-auth.md',
        },
        {
          id: memoryId('decision-api'),
          type: MemoryType.Decision,
          title: 'API',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-api.md',
        },
        {
          id: memoryId('hub-decisions'),
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
    setupGraphMocks();

    const result = await bulkLink({
      target: 'hub-decisions',
      sourceIds: ['decision-auth', 'decision-api'],
    });

    expect(result.status).toBe('success');
    expect(result.createdCount).toBe(2);
    expect(edgesModule.addEdge).toHaveBeenCalledTimes(2);
  });

  it('should exclude target from sources', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('decision-auth'),
          type: MemoryType.Decision,
          title: 'Auth',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-auth.md',
        },
        {
          id: memoryId('hub-decisions'),
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
    setupGraphMocks();

    const result = await bulkLink({
      target: 'hub-decisions',
      sourceIds: ['decision-auth', 'hub-decisions'],
    });

    expect(result.status).toBe('success');
    expect(result.createdCount).toBe(1);
    expect(edgesModule.addEdge).toHaveBeenCalledTimes(1);
  });

  it('should return matched links in dry run mode', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('decision-auth'),
          type: MemoryType.Decision,
          title: 'Auth',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-auth.md',
        },
        {
          id: memoryId('hub-decisions'),
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

    const result = await bulkLink({
      target: 'hub-decisions',
      sourcePattern: 'decision-*',
      dryRun: true,
    });

    expect(result.status).toBe('success');
    expect(result.createdCount).toBe(1);
    expect(result.dryRun).toBe(true);
  });

  it('should count existing links', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('decision-new'),
          type: MemoryType.Decision,
          title: 'New',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-new.md',
        },
        {
          id: memoryId('decision-existing'),
          type: MemoryType.Decision,
          title: 'Existing',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-existing.md',
        },
        {
          id: memoryId('hub-decisions'),
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

    const mockGraph = { version: 1, nodes: [], edges: [] };
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue(mockGraph as any);
    vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined);
    vi.spyOn(structureModule, 'hasNode').mockReturnValue(false);
    vi.spyOn(structureModule, 'addNode').mockImplementation((g) => g);
    vi.spyOn(edgesModule, 'hasEdge')
      .mockReturnValueOnce(false) // decision-new -> hub-decisions (new)
      .mockReturnValueOnce(true); // decision-existing -> hub-decisions (existing)
    vi.spyOn(edgesModule, 'addEdge').mockImplementation((g) => g);

    const result = await bulkLink({
      target: 'hub-decisions',
      sourceIds: ['decision-new', 'decision-existing'],
    });

    expect(result.status).toBe('success');
    expect(result.createdCount).toBe(1);
    expect(result.existingCount).toBe(1);
  });

  it('should report failed links for missing sources', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('decision-good'),
          type: MemoryType.Decision,
          title: 'Good',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-good.md',
        },
        {
          id: memoryId('hub-decisions'),
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
    setupGraphMocks();

    const result = await bulkLink({
      target: 'hub-decisions',
      sourceIds: ['decision-good', 'decision-missing'],
    });

    expect(result.status).toBe('success');
    expect(result.createdCount).toBe(1);
    expect(result.failedLinks).toEqual([{ source: 'decision-missing', reason: 'Source memory not found' }]);
  });

  it('should call progress callback', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('decision-1'),
          type: MemoryType.Decision,
          title: '1',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-1.md',
        },
        {
          id: memoryId('decision-2'),
          type: MemoryType.Decision,
          title: '2',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-2.md',
        },
        {
          id: memoryId('hub-decisions'),
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
    setupGraphMocks();

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
