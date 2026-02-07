/**
 * TD02/TD05: Unit tests for cross-scope edge operations
 *
 * Tests for isCrossScopeEdge(), validateCrossScopeEdge(), and addEdge() with metadata.
 */

import { describe, it, expect } from 'vitest';
import { addEdge, isCrossScopeEdge, validateCrossScopeEdge } from './edges.js';
import type { GraphEdge, MemoryGraph } from './structure.js';

describe('isCrossScopeEdge (TD02)', () => {
  it('should return true when sourceScope and targetScope are present', () => {
    const edge: GraphEdge = {
      source: 'agent-learning-1',
      target: 'project-decision-1',
      label: 'informs',
      sourceScope: 'agent-project',
      targetScope: 'project',
      sourceAgent: 'ts-expert',
    };

    expect(isCrossScopeEdge(edge)).toBe(true);
  });

  it('should return true for agent-to-agent edges', () => {
    const edge: GraphEdge = {
      source: 'ts-learning-1',
      target: 'rust-decision-1',
      label: 'relates-to',
      sourceScope: 'agent-project',
      targetScope: 'agent-project',
      sourceAgent: 'ts-expert',
      targetAgent: 'rust-expert',
    };

    expect(isCrossScopeEdge(edge)).toBe(true);
  });

  it('should return false for standard edges without scope fields', () => {
    const edge: GraphEdge = {
      source: 'node-a',
      target: 'node-b',
      label: 'relates-to',
    };

    expect(isCrossScopeEdge(edge)).toBe(false);
  });

  it('should return false when only source or target is present but not both', () => {
    const edgeSourceOnly = {
      source: 'node-a',
      target: 'node-b',
      label: 'relates-to',
      sourceScope: 'agent-project',
    } as GraphEdge;

    // sourceScope without targetScope is not a valid cross-scope edge
    expect(isCrossScopeEdge(edgeSourceOnly)).toBe(false);
  });
});

describe('validateCrossScopeEdge (TD02)', () => {
  it('should accept valid agent-to-project edge', () => {
    const edge: GraphEdge = {
      source: 'agent-learning-1',
      target: 'project-decision-1',
      label: 'informs',
      sourceScope: 'agent-project',
      targetScope: 'project',
      sourceAgent: 'ts-expert',
    };

    const result = validateCrossScopeEdge(edge);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept valid project-to-agent edge', () => {
    const edge: GraphEdge = {
      source: 'project-decision-1',
      target: 'agent-learning-1',
      label: 'informs',
      sourceScope: 'project',
      targetScope: 'agent-project',
      targetAgent: 'ts-expert',
    };

    const result = validateCrossScopeEdge(edge);
    expect(result.valid).toBe(true);
  });

  it('should accept valid agent-to-agent edge', () => {
    const edge: GraphEdge = {
      source: 'ts-learning-1',
      target: 'rust-decision-1',
      label: 'relates-to',
      sourceScope: 'agent-project',
      targetScope: 'agent-project',
      sourceAgent: 'ts-expert',
      targetAgent: 'rust-expert',
    };

    const result = validateCrossScopeEdge(edge);
    expect(result.valid).toBe(true);
  });

  it('should reject edge with targetScope but no sourceScope', () => {
    const edge = {
      source: 'node-a',
      target: 'node-b',
      label: 'relates-to',
      targetScope: 'project',
    } as GraphEdge;

    const result = validateCrossScopeEdge(edge);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('sourceScope');
  });

  it('should reject edge with sourceScope but no targetScope', () => {
    const edge = {
      source: 'node-a',
      target: 'node-b',
      label: 'relates-to',
      sourceScope: 'agent-project',
    } as GraphEdge;

    const result = validateCrossScopeEdge(edge);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('targetScope');
  });

  it('should reject agent-scope source without sourceAgent', () => {
    const edge = {
      source: 'node-a',
      target: 'node-b',
      label: 'relates-to',
      sourceScope: 'agent-project',
      targetScope: 'project',
    } as GraphEdge;

    const result = validateCrossScopeEdge(edge);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('sourceAgent');
  });

  it('should reject agent-scope target without targetAgent', () => {
    const edge = {
      source: 'node-a',
      target: 'node-b',
      label: 'relates-to',
      sourceScope: 'project',
      targetScope: 'agent-project',
    } as GraphEdge;

    const result = validateCrossScopeEdge(edge);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('targetAgent');
  });

  it('should reject agent-global scope without agent name', () => {
    const edge = {
      source: 'node-a',
      target: 'node-b',
      label: 'relates-to',
      sourceScope: 'agent-global',
      targetScope: 'global',
    } as GraphEdge;

    const result = validateCrossScopeEdge(edge);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('sourceAgent');
  });

  it('should accept non-cross-scope edge (no scope fields)', () => {
    const edge: GraphEdge = {
      source: 'node-a',
      target: 'node-b',
      label: 'relates-to',
    };

    const result = validateCrossScopeEdge(edge);
    expect(result.valid).toBe(true);
  });
});

describe('addEdge with metadata (TD05)', () => {
  const baseGraph: MemoryGraph = {
    version: 1,
    nodes: [
      { id: 'agent-learning-1', type: 'learning', scope: 'agent-project', agent: 'ts-expert' },
      { id: 'project-decision-1', type: 'decision', scope: 'project' },
    ],
    edges: [],
  };

  it('should preserve cross-scope metadata fields in returned edge', () => {
    const metadata = {
      sourceScope: 'agent-project',
      targetScope: 'project',
      sourceAgent: 'ts-expert',
    };

    const updated = addEdge(
      baseGraph,
      'agent-learning-1',
      'project-decision-1',
      'informs',
      metadata
    );

    expect(updated.edges).toHaveLength(1);
    const edge = updated.edges[0]!;
    expect(edge.source).toBe('agent-learning-1');
    expect(edge.target).toBe('project-decision-1');
    expect(edge.label).toBe('informs');
    expect(edge.sourceScope).toBe('agent-project');
    expect(edge.targetScope).toBe('project');
    expect(edge.sourceAgent).toBe('ts-expert');
    expect(edge.targetAgent).toBeUndefined();
  });

  it('should preserve agent-to-agent metadata', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'ts-learning', type: 'learning', scope: 'agent-project', agent: 'ts-expert' },
        { id: 'rust-decision', type: 'decision', scope: 'agent-project', agent: 'rust-expert' },
      ],
      edges: [],
    };

    const metadata = {
      sourceScope: 'agent-project',
      targetScope: 'agent-project',
      sourceAgent: 'ts-expert',
      targetAgent: 'rust-expert',
    };

    const updated = addEdge(graph, 'ts-learning', 'rust-decision', 'relates-to', metadata);

    const edge = updated.edges[0]!;
    expect(edge.sourceAgent).toBe('ts-expert');
    expect(edge.targetAgent).toBe('rust-expert');
  });

  it('should remain backward compatible when no metadata provided', () => {
    const updated = addEdge(baseGraph, 'agent-learning-1', 'project-decision-1', 'relates-to');

    expect(updated.edges).toHaveLength(1);
    const edge = updated.edges[0]!;
    expect(edge.source).toBe('agent-learning-1');
    expect(edge.target).toBe('project-decision-1');
    expect(edge.label).toBe('relates-to');
    expect(edge.sourceScope).toBeUndefined();
    expect(edge.targetScope).toBeUndefined();
    expect(edge.sourceAgent).toBeUndefined();
    expect(edge.targetAgent).toBeUndefined();
  });

  it('should not duplicate cross-scope edge with same metadata', () => {
    const metadata = {
      sourceScope: 'agent-project',
      targetScope: 'project',
      sourceAgent: 'ts-expert',
    };

    const first = addEdge(baseGraph, 'agent-learning-1', 'project-decision-1', 'informs', metadata);
    const second = addEdge(first, 'agent-learning-1', 'project-decision-1', 'informs', metadata);

    expect(second.edges).toHaveLength(1);
  });
});
