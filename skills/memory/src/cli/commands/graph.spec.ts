/**
 * Tests for CLI Graph Commands
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { cmdLink, cmdUnlink, cmdEdges, cmdGraph, cmdMermaid, cmdRemoveNode } from './graph.js';
import * as linkModule from '../../graph/link.js';
import * as structureModule from '../../graph/structure.js';
import * as edgesModule from '../../graph/edges.js';
import * as mermaidModule from '../../graph/mermaid.js';
import type { ParsedArgs } from '../parser.js';

describe('cmdLink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when source is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdLink(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required arguments');
  });

  it('returns error when target is missing', async () => {
    const args: ParsedArgs = { positional: ['source-id'], flags: {} };
    const result = await cmdLink(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required arguments');
  });

  it('calls linkMemories with source and target', async () => {
    vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({ status: 'success' });

    const args: ParsedArgs = { positional: ['from-id', 'to-id'], flags: {} };
    const result = await cmdLink(args);

    expect(result.status).toBe('success');
    expect(linkModule.linkMemories).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'from-id', target: 'to-id' })
    );
  });

  it('passes relation flag', async () => {
    vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({ status: 'success' });

    const args: ParsedArgs = {
      positional: ['from', 'to'],
      flags: { relation: 'depends-on' },
    };
    await cmdLink(args);

    expect(linkModule.linkMemories).toHaveBeenCalledWith(
      expect.objectContaining({ relation: 'depends-on' })
    );
  });
});

describe('cmdUnlink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when arguments missing', async () => {
    const args: ParsedArgs = { positional: ['only-one'], flags: {} };
    const result = await cmdUnlink(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required arguments');
  });

  it('calls unlinkMemories with source and target', async () => {
    vi.spyOn(linkModule, 'unlinkMemories').mockResolvedValue({ status: 'success' });

    const args: ParsedArgs = { positional: ['from', 'to'], flags: {} };
    const result = await cmdUnlink(args);

    expect(result.status).toBe('success');
    expect(linkModule.unlinkMemories).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'from', target: 'to' })
    );
  });
});

describe('cmdEdges', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when id is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdEdges(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: id');
  });

  it('returns inbound and outbound edges', async () => {
    const mockGraph = { version: 1, nodes: [], edges: [] };
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue(mockGraph as any);
    vi.spyOn(edgesModule, 'getInboundEdges').mockReturnValue([
      { source: 'other', target: 'my-id', label: 'related' },
    ] as any);
    vi.spyOn(edgesModule, 'getOutboundEdges').mockReturnValue([]);

    const args: ParsedArgs = { positional: ['my-id'], flags: {} };
    const result = await cmdEdges(args);

    expect(result.status).toBe('success');
    expect(result.data).toHaveProperty('inbound');
    expect(result.data).toHaveProperty('outbound');
  });
});

describe('cmdGraph', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns graph data', async () => {
    const mockGraph = { version: 1, nodes: ['a', 'b'], edges: [] };
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue(mockGraph as any);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdGraph(args);

    expect(result.status).toBe('success');
    expect(result.data).toEqual(mockGraph);
  });

  it('respects scope flag', async () => {
    const mockGraph = { version: 1, nodes: [], edges: [] };
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue(mockGraph as any);

    const args: ParsedArgs = { positional: ['local'], flags: {} };
    await cmdGraph(args);

    expect(structureModule.loadGraph).toHaveBeenCalledWith(
      expect.stringContaining('.claude/memory')
    );
  });
});

describe('cmdMermaid', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates mermaid diagram', async () => {
    const mockGraph = { version: 1, nodes: [], edges: [] };
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue(mockGraph as any);
    vi.spyOn(mermaidModule, 'generateMermaid').mockReturnValue('graph TD\n  A --> B');

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdMermaid(args);

    expect(result.status).toBe('success');
    expect((result.data as { mermaid: string }).mermaid).toContain('graph');
  });

  it('passes direction flag', async () => {
    const mockGraph = { version: 1, nodes: [], edges: [] };
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue(mockGraph as any);
    vi.spyOn(mermaidModule, 'generateMermaid').mockReturnValue('graph LR');

    const args: ParsedArgs = { positional: [], flags: { direction: 'LR' } };
    await cmdMermaid(args);

    expect(mermaidModule.generateMermaid).toHaveBeenCalledWith(
      mockGraph,
      expect.objectContaining({ direction: 'LR' })
    );
  });
});

describe('cmdRemoveNode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when id is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdRemoveNode(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: id');
  });

  it('removes node from graph and returns stats', async () => {
    const mockGraph = { version: 1, nodes: ['my-node', 'other'], edges: [] };
    const updatedGraph = { version: 1, nodes: ['other'], edges: [] };
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue(mockGraph as any);
    vi.spyOn(structureModule, 'removeNode').mockReturnValue(updatedGraph as any);

    const args: ParsedArgs = { positional: ['my-node'], flags: {} };
    const result = await cmdRemoveNode(args);

    expect(result.status).toBe('success');
    expect(structureModule.removeNode).toHaveBeenCalledWith(mockGraph, 'my-node');
    expect(result.data).toHaveProperty('removed', 'my-node');
    expect(result.data).toHaveProperty('remainingNodes', 1);
  });
});
