/**
 * Unit tests for link operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memoryId } from '../test-utils/branded-helpers.js';
import { linkMemories, unlinkMemories } from './link.js';
import { MemoryType, Scope } from '../types/enums.js';
import * as structureModule from './structure.js';
import * as edgesModule from './edges.js';
import * as indexModule from '../core/index.js';

describe('linkMemories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when source is missing', async () => {
    const result = await linkMemories({ source: '', target: 'target-id' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('source is required');
  });

  it('should return error when target is missing', async () => {
    const result = await linkMemories({ source: 'source-id', target: '' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('target is required');
  });

  it('should return error for self-referencing link', async () => {
    const result = await linkMemories({ source: 'same-id', target: 'same-id' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('self-referencing');
  });

  it('should return error when source memory not found', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('target-id'),
          type: MemoryType.Decision,
          title: 'Target',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/target-id.md',
        },
      ],
    });

    const result = await linkMemories({ source: 'nonexistent', target: 'target-id' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('Source memory not found');
  });

  it('should return error when target memory not found', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('source-id'),
          type: MemoryType.Decision,
          title: 'Source',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/source-id.md',
        },
      ],
    });

    const result = await linkMemories({ source: 'source-id', target: 'nonexistent' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('Target memory not found');
  });

  it('should create link between memories', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('source-id'),
          type: MemoryType.Decision,
          title: 'Source',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/source-id.md',
        },
        {
          id: memoryId('target-id'),
          type: MemoryType.Artifact,
          title: 'Target',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/target-id.md',
        },
      ],
    });

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
    });

    vi.spyOn(structureModule, 'hasNode').mockReturnValue(false);
    vi.spyOn(structureModule, 'addNode').mockImplementation((graph, node) => ({
      ...graph,
      nodes: [...graph.nodes, node],
    }));

    vi.spyOn(edgesModule, 'hasEdge').mockReturnValue(false);
    vi.spyOn(edgesModule, 'addEdge').mockImplementation((graph, source, target, label = 'relates-to') => ({
      ...graph,
      edges: [...graph.edges, { source, target, label }],
    }));

    vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined);

    const result = await linkMemories({
      source: 'source-id',
      target: 'target-id',
      relation: 'implements',
    });

    expect(result.status).toBe('success');
    expect(result.edge).toEqual({
      source: 'source-id',
      target: 'target-id',
      label: 'implements',
    });
    expect(result.alreadyExists).toBe(false);
    expect(structureModule.saveGraph).toHaveBeenCalled();
  });

  it('should return alreadyExists true when link exists', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('source-id'),
          type: MemoryType.Decision,
          title: 'Source',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/source-id.md',
        },
        {
          id: memoryId('target-id'),
          type: MemoryType.Artifact,
          title: 'Target',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/target-id.md',
        },
      ],
    });

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [
        { id: memoryId('source-id'), type: 'decision' },
        { id: memoryId('target-id'), type: 'artifact' },
      ],
      edges: [{ source: 'source-id', target: 'target-id', label: 'relates-to' }],
    });

    vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);
    vi.spyOn(edgesModule, 'hasEdge').mockReturnValue(true);
    vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined);

    const result = await linkMemories({
      source: 'source-id',
      target: 'target-id',
    });

    expect(result.status).toBe('success');
    expect(result.alreadyExists).toBe(true);
    expect(structureModule.saveGraph).not.toHaveBeenCalled();
  });

  it('should use default relation when not specified', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: memoryId('source-id'),
          type: MemoryType.Decision,
          title: 'Source',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/source-id.md',
        },
        {
          id: memoryId('target-id'),
          type: MemoryType.Artifact,
          title: 'Target',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/target-id.md',
        },
      ],
    });

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
    });

    vi.spyOn(structureModule, 'hasNode').mockReturnValue(false);
    vi.spyOn(structureModule, 'addNode').mockImplementation((graph, node) => ({
      ...graph,
      nodes: [...graph.nodes, node],
    }));

    vi.spyOn(edgesModule, 'hasEdge').mockReturnValue(false);
    vi.spyOn(edgesModule, 'addEdge').mockImplementation((graph, source, target, label = 'relates-to') => ({
      ...graph,
      edges: [...graph.edges, { source, target, label }],
    }));

    vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined);

    const result = await linkMemories({
      source: 'source-id',
      target: 'target-id',
    });

    expect(result.status).toBe('success');
    expect(result.edge?.label).toBe('relates-to');
  });

  it('should handle errors during link creation', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockRejectedValue(new Error('Index corrupted'));

    const result = await linkMemories({
      source: 'source-id',
      target: 'target-id',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to create link');
    expect(result.error).toContain('Index corrupted');
  });
});

describe('unlinkMemories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when source is missing', async () => {
    const result = await unlinkMemories({ source: '', target: 'target-id' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('source is required');
  });

  it('should return error when target is missing', async () => {
    const result = await unlinkMemories({ source: 'source-id', target: '' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('target is required');
  });

  it('should remove link between memories', async () => {
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [
        { id: memoryId('source-id'), type: 'decision' },
        { id: memoryId('target-id'), type: 'artifact' },
      ],
      edges: [{ source: 'source-id', target: 'target-id', label: 'relates-to' }],
    });

    vi.spyOn(edgesModule, 'removeEdge').mockReturnValue({
      version: 1,
      nodes: [
        { id: memoryId('source-id'), type: 'decision' },
        { id: memoryId('target-id'), type: 'artifact' },
      ],
      edges: [],
    });

    vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined);

    const result = await unlinkMemories({
      source: 'source-id',
      target: 'target-id',
    });

    expect(result.status).toBe('success');
    expect(result.removedCount).toBe(1);
    expect(structureModule.saveGraph).toHaveBeenCalled();
  });

  it('should return removedCount 0 when no link exists', async () => {
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
    });

    vi.spyOn(edgesModule, 'removeEdge').mockReturnValue({
      version: 1,
      nodes: [],
      edges: [],
    });

    const saveGraphSpy = vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined);

    const result = await unlinkMemories({
      source: 'source-id',
      target: 'target-id',
    });

    expect(result.status).toBe('success');
    expect(result.removedCount).toBe(0);
    expect(saveGraphSpy).not.toHaveBeenCalled();
  });

  it('should remove specific relation when specified', async () => {
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [
        { id: memoryId('source-id'), type: 'decision' },
        { id: memoryId('target-id'), type: 'artifact' },
      ],
      edges: [
        { source: 'source-id', target: 'target-id', label: 'implements' },
        { source: 'source-id', target: 'target-id', label: 'relates-to' },
      ],
    });

    vi.spyOn(edgesModule, 'removeEdge').mockReturnValue({
      version: 1,
      nodes: [
        { id: memoryId('source-id'), type: 'decision' },
        { id: memoryId('target-id'), type: 'artifact' },
      ],
      edges: [{ source: 'source-id', target: 'target-id', label: 'relates-to' }],
    });

    vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined);

    const result = await unlinkMemories({
      source: 'source-id',
      target: 'target-id',
      relation: 'implements',
    });

    expect(result.status).toBe('success');
    expect(result.removedCount).toBe(1);
    expect(edgesModule.removeEdge).toHaveBeenCalledWith(
      expect.any(Object),
      'source-id',
      'target-id',
      'implements'
    );
  });

  it('should handle errors during link removal', async () => {
    vi.spyOn(structureModule, 'loadGraph').mockRejectedValue(new Error('Graph corrupted'));

    const result = await unlinkMemories({
      source: 'source-id',
      target: 'target-id',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to remove link');
    expect(result.error).toContain('Graph corrupted');
  });
});
