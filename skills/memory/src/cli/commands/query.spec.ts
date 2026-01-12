/**
 * Tests for CLI Query Commands
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { cmdQuery, cmdStats, cmdImpact } from './query.js';
import * as structureModule from '../../graph/structure.js';
import * as edgesModule from '../../graph/edges.js';
import * as traversalModule from '../../graph/traversal.js';
import * as indexModule from '../../core/index.js';
import type { ParsedArgs } from '../parser.js';

describe('cmdQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads index and graph', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      memories: [],
    } as any);
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
    } as any);
    vi.spyOn(edgesModule, 'findOrphanedNodes').mockReturnValue([]);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdQuery(args);

    expect(result.status).toBe('success');
    expect(indexModule.loadIndex).toHaveBeenCalled();
    expect(structureModule.loadGraph).toHaveBeenCalled();
  });

  it('filters by type', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      memories: [
        { id: 'decision-1', type: 'decision', tags: [] },
        { id: 'learning-1', type: 'learning', tags: [] },
      ],
    } as any);
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
    } as any);
    vi.spyOn(edgesModule, 'findOrphanedNodes').mockReturnValue([]);
    vi.spyOn(edgesModule, 'getInboundEdges').mockReturnValue([]);
    vi.spyOn(edgesModule, 'getOutboundEdges').mockReturnValue([]);

    const args: ParsedArgs = { positional: [], flags: { type: 'decision' } };
    const result = await cmdQuery(args);

    expect(result.status).toBe('success');
    expect((result.data as any).results).toHaveLength(1);
    expect((result.data as any).results[0].id).toBe('decision-1');
  });

  it('filters by tags', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      memories: [
        { id: 'mem-1', type: 'learning', tags: ['typescript', 'testing'] },
        { id: 'mem-2', type: 'learning', tags: ['python'] },
      ],
    } as any);
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
    } as any);
    vi.spyOn(edgesModule, 'findOrphanedNodes').mockReturnValue([]);
    vi.spyOn(edgesModule, 'getInboundEdges').mockReturnValue([]);
    vi.spyOn(edgesModule, 'getOutboundEdges').mockReturnValue([]);

    const args: ParsedArgs = { positional: [], flags: { tags: 'typescript' } };
    const result = await cmdQuery(args);

    expect(result.status).toBe('success');
    expect((result.data as any).results).toHaveLength(1);
    expect((result.data as any).results[0].id).toBe('mem-1');
  });

  it('filters for orphans', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      memories: [
        { id: 'connected', type: 'learning', tags: [] },
        { id: 'orphan', type: 'learning', tags: [] },
      ],
    } as any);
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
    } as any);
    vi.spyOn(edgesModule, 'findOrphanedNodes').mockReturnValue(['orphan']);
    vi.spyOn(edgesModule, 'getInboundEdges').mockReturnValue([]);
    vi.spyOn(edgesModule, 'getOutboundEdges').mockReturnValue([]);

    const args: ParsedArgs = { positional: [], flags: { orphans: true } };
    const result = await cmdQuery(args);

    expect(result.status).toBe('success');
    expect((result.data as any).results).toHaveLength(1);
    expect((result.data as any).results[0].id).toBe('orphan');
  });

  it('applies limit', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      memories: [
        { id: 'mem-1', type: 'learning', tags: [] },
        { id: 'mem-2', type: 'learning', tags: [] },
        { id: 'mem-3', type: 'learning', tags: [] },
      ],
    } as any);
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
    } as any);
    vi.spyOn(edgesModule, 'findOrphanedNodes').mockReturnValue([]);
    vi.spyOn(edgesModule, 'getInboundEdges').mockReturnValue([]);
    vi.spyOn(edgesModule, 'getOutboundEdges').mockReturnValue([]);

    const args: ParsedArgs = { positional: [], flags: { limit: '2' } };
    const result = await cmdQuery(args);

    expect(result.status).toBe('success');
    expect((result.data as any).returned).toBe(2);
    expect((result.data as any).totalMatches).toBe(3);
  });
});

describe('cmdStats', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns graph statistics', async () => {
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      edges: [{ source: 'a', target: 'b', label: 'related' }],
    } as any);
    vi.spyOn(edgesModule, 'findOrphanedNodes').mockReturnValue(['c']);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdStats(args);

    expect(result.status).toBe('success');
    expect((result.data as any).nodes).toBe(3);
    expect((result.data as any).edges).toBe(1);
    expect((result.data as any).orphans).toBe(1);
  });

  it('accepts scope positional', async () => {
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
    } as any);
    vi.spyOn(edgesModule, 'findOrphanedNodes').mockReturnValue([]);

    const args: ParsedArgs = { positional: ['global'], flags: {} };
    const result = await cmdStats(args);

    expect(result.status).toBe('success');
    expect((result.data as any).scope).toBe('global');
  });
});

describe('cmdImpact', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when id is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdImpact(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: id');
  });

  it('calls calculateImpact with id', async () => {
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
    } as any);
    vi.spyOn(traversalModule, 'calculateImpact').mockReturnValue({
      directDependents: [],
      transitiveDependents: [],
      depth: 0,
    } as any);

    const args: ParsedArgs = { positional: ['hub-decisions'], flags: {} };
    const result = await cmdImpact(args);

    expect(result.status).toBe('success');
    expect(traversalModule.calculateImpact).toHaveBeenCalledWith(
      expect.anything(),
      'hub-decisions'
    );
    expect((result.data as any).id).toBe('hub-decisions');
  });
});
