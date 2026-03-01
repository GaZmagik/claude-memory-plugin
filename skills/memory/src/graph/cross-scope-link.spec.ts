/**
 * TD06/TD07: Unit tests for cross-scope link storage and removal
 *
 * Tests for storeCrossScopeEdge() and removeCrossScopeEdge().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storeCrossScopeEdge, removeCrossScopeEdge } from './link.js';
import * as structureModule from './structure.js';
import * as indexModule from '../core/index.js';
import { memoryId } from '../test-utils/branded-helpers.js';
import { MemoryType, Scope } from '../types/enums.js';

describe('storeCrossScopeEdge (TD06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should write identical edge to both source and target graph files', async () => {
    const sourceBasePath = '/tmp/agent-ts-expert';
    const targetBasePath = '/tmp/project-memory';

    // Mock index loads for both scopes
    vi.spyOn(indexModule, 'loadIndex')
      .mockResolvedValueOnce({
        version: '1.0.0',
        lastUpdated: '2026-01-01T00:00:00.000Z',
        memories: [{
          id: memoryId('agent-learning-1'),
          type: MemoryType.Learning,
          title: 'Agent Learning',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.AgentProject,
          agent: 'ts-expert',
          relativePath: 'learning/agent-learning-1.md',
        }],
      })
      .mockResolvedValueOnce({
        version: '1.0.0',
        lastUpdated: '2026-01-01T00:00:00.000Z',
        memories: [{
          id: memoryId('project-decision-1'),
          type: MemoryType.Decision,
          title: 'Project Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/project-decision-1.md',
        }],
      });

    // Mock graph loads (both start empty)
    vi.spyOn(structureModule, 'loadGraph')
      .mockResolvedValueOnce({ version: 1, nodes: [], edges: [] })
      .mockResolvedValueOnce({ version: 1, nodes: [], edges: [] });

    const saveGraphSpy = vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined);

    const result = await storeCrossScopeEdge({
      sourceId: 'agent-learning-1',
      targetId: 'project-decision-1',
      relation: 'informs',
      sourceBasePath,
      targetBasePath,
      sourceScope: Scope.AgentProject,
      targetScope: Scope.Project,
      sourceAgent: 'ts-expert',
    });

    expect(result.status).toBe('success');

    // Should have saved to both graphs
    expect(saveGraphSpy).toHaveBeenCalledTimes(2);

    // First save = source graph
    const sourceGraph = saveGraphSpy.mock.calls[0]![1];
    expect(sourceGraph.edges).toHaveLength(1);
    expect(sourceGraph.edges[0]).toMatchObject({
      source: 'agent-learning-1',
      target: 'project-decision-1',
      label: 'informs',
      sourceScope: Scope.AgentProject,
      targetScope: Scope.Project,
      sourceAgent: 'ts-expert',
    });

    // Second save = target graph (identical edge)
    const targetGraph = saveGraphSpy.mock.calls[1]![1];
    expect(targetGraph.edges).toHaveLength(1);
    expect(targetGraph.edges[0]).toMatchObject({
      source: 'agent-learning-1',
      target: 'project-decision-1',
      label: 'informs',
      sourceScope: Scope.AgentProject,
      targetScope: Scope.Project,
      sourceAgent: 'ts-expert',
    });
  });

  it('should add nodes with enrichment from index when missing from graph', async () => {
    const sourceBasePath = '/tmp/agent-ts-expert';
    const targetBasePath = '/tmp/project-memory';

    vi.spyOn(indexModule, 'loadIndex')
      .mockResolvedValueOnce({
        version: '1.0.0',
        lastUpdated: '2026-01-01T00:00:00.000Z',
        memories: [{
          id: memoryId('agent-learning-1'),
          type: MemoryType.Learning,
          title: 'Agent Learning',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.AgentProject,
          agent: 'ts-expert',
          relativePath: 'learning/agent-learning-1.md',
        }],
      })
      .mockResolvedValueOnce({
        version: '1.0.0',
        lastUpdated: '2026-01-01T00:00:00.000Z',
        memories: [{
          id: memoryId('project-decision-1'),
          type: MemoryType.Decision,
          title: 'Project Decision',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/project-decision-1.md',
        }],
      });

    vi.spyOn(structureModule, 'loadGraph')
      .mockResolvedValueOnce({ version: 1, nodes: [], edges: [] })
      .mockResolvedValueOnce({ version: 1, nodes: [], edges: [] });

    const saveGraphSpy = vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined);

    await storeCrossScopeEdge({
      sourceId: 'agent-learning-1',
      targetId: 'project-decision-1',
      relation: 'informs',
      sourceBasePath,
      targetBasePath,
      sourceScope: Scope.AgentProject,
      targetScope: Scope.Project,
      sourceAgent: 'ts-expert',
    });

    // Source graph should have both nodes with enrichment
    const sourceGraph = saveGraphSpy.mock.calls[0]![1];
    const sourceNode = sourceGraph.nodes.find((n: any) => n.id === 'agent-learning-1');
    const targetNodeInSource = sourceGraph.nodes.find((n: any) => n.id === 'project-decision-1');
    expect(sourceNode).toMatchObject({ id: 'agent-learning-1', type: MemoryType.Learning });
    expect(targetNodeInSource).toMatchObject({ id: 'project-decision-1', type: MemoryType.Decision });

    // Target graph should also have both nodes
    const targetGraph = saveGraphSpy.mock.calls[1]![1];
    const sourceNodeInTarget = targetGraph.nodes.find((n: any) => n.id === 'agent-learning-1');
    const targetNode = targetGraph.nodes.find((n: any) => n.id === 'project-decision-1');
    expect(sourceNodeInTarget).toMatchObject({ id: 'agent-learning-1', type: MemoryType.Learning });
    expect(targetNode).toMatchObject({ id: 'project-decision-1', type: MemoryType.Decision });
  });

  it('should save source graph first, then target graph', async () => {
    const callOrder: string[] = [];
    const sourceBasePath = '/tmp/source';
    const targetBasePath = '/tmp/target';

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        { id: memoryId('src'), type: MemoryType.Learning, title: 'Src', tags: [], created: '2026-01-01T00:00:00.000Z', updated: '2026-01-01T00:00:00.000Z', scope: Scope.AgentProject, agent: 'ts-expert', relativePath: 'src.md' },
        { id: memoryId('tgt'), type: MemoryType.Decision, title: 'Tgt', tags: [], created: '2026-01-01T00:00:00.000Z', updated: '2026-01-01T00:00:00.000Z', scope: Scope.Project, relativePath: 'tgt.md' },
      ],
    });

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({ version: 1, nodes: [], edges: [] });

    vi.spyOn(structureModule, 'saveGraph').mockImplementation(async (basePath) => {
      callOrder.push(basePath);
    });

    await storeCrossScopeEdge({
      sourceId: 'src',
      targetId: 'tgt',
      relation: 'informs',
      sourceBasePath,
      targetBasePath,
      sourceScope: Scope.AgentProject,
      targetScope: Scope.Project,
      sourceAgent: 'ts-expert',
    });

    expect(callOrder).toEqual([sourceBasePath, targetBasePath]);
  });
});

describe('removeCrossScopeEdge (TD07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should remove matching edge from both graphs', async () => {
    const sourceBasePath = '/tmp/agent-ts-expert';
    const targetBasePath = '/tmp/project-memory';

    const crossEdge = {
      source: 'agent-learning-1',
      target: 'project-decision-1',
      label: 'informs',
      sourceScope: Scope.AgentProject,
      targetScope: Scope.Project,
      sourceAgent: 'ts-expert',
    };

    vi.spyOn(structureModule, 'loadGraph')
      .mockResolvedValueOnce({
        version: 1,
        nodes: [
          { id: 'agent-learning-1', type: MemoryType.Learning },
          { id: 'project-decision-1', type: MemoryType.Decision },
        ],
        edges: [crossEdge],
      })
      .mockResolvedValueOnce({
        version: 1,
        nodes: [
          { id: 'agent-learning-1', type: MemoryType.Learning },
          { id: 'project-decision-1', type: MemoryType.Decision },
        ],
        edges: [crossEdge],
      });

    const saveGraphSpy = vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined);

    const result = await removeCrossScopeEdge({
      sourceId: 'agent-learning-1',
      targetId: 'project-decision-1',
      relation: 'informs',
      sourceBasePath,
      targetBasePath,
    });

    expect(result.status).toBe('success');
    expect(result.removedCount).toBe(2);

    // Both graphs should be saved with edge removed
    expect(saveGraphSpy).toHaveBeenCalledTimes(2);
    const sourceGraph = saveGraphSpy.mock.calls[0]![1];
    const targetGraph = saveGraphSpy.mock.calls[1]![1];
    expect(sourceGraph.edges).toHaveLength(0);
    expect(targetGraph.edges).toHaveLength(0);
  });

  it('should handle missing target graph gracefully (best-effort)', async () => {
    const sourceBasePath = '/tmp/agent-ts-expert';
    const targetBasePath = '/tmp/missing-path';

    const crossEdge = {
      source: 'agent-learning-1',
      target: 'project-decision-1',
      label: 'informs',
      sourceScope: Scope.AgentProject,
      targetScope: Scope.Project,
      sourceAgent: 'ts-expert',
    };

    vi.spyOn(structureModule, 'loadGraph')
      .mockResolvedValueOnce({
        version: 1,
        nodes: [{ id: 'agent-learning-1', type: MemoryType.Learning }],
        edges: [crossEdge],
      })
      .mockRejectedValueOnce(new Error('ENOENT: no such directory'));

    const saveGraphSpy = vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined);

    const result = await removeCrossScopeEdge({
      sourceId: 'agent-learning-1',
      targetId: 'project-decision-1',
      relation: 'informs',
      sourceBasePath,
      targetBasePath,
    });

    // Should succeed (source graph cleaned up) even if target fails
    expect(result.status).toBe('success');
    expect(result.removedCount).toBe(1);

    // Only source graph saved
    expect(saveGraphSpy).toHaveBeenCalledTimes(1);
    expect(saveGraphSpy.mock.calls[0]![0]).toBe(sourceBasePath);
  });

  it('should return 0 removedCount when no matching edges found', async () => {
    const sourceBasePath = '/tmp/agent-ts-expert';
    const targetBasePath = '/tmp/project-memory';

    vi.spyOn(structureModule, 'loadGraph')
      .mockResolvedValueOnce({ version: 1, nodes: [], edges: [] })
      .mockResolvedValueOnce({ version: 1, nodes: [], edges: [] });

    const saveGraphSpy = vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined);

    const result = await removeCrossScopeEdge({
      sourceId: 'nonexistent',
      targetId: 'also-nonexistent',
      sourceBasePath,
      targetBasePath,
    });

    expect(result.status).toBe('success');
    expect(result.removedCount).toBe(0);
    expect(saveGraphSpy).not.toHaveBeenCalled();
  });
});
