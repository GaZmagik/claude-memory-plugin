/**
 * T066: Unit tests for link/unlink operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  addEdge,
  removeEdge,
  getEdges,
  getInboundEdges,
  getOutboundEdges,
  getAllEdgesForNode,
  hasEdge,
  getNeighbours,
  getNodeDegree,
  findOrphanedNodes,
  bulkAddEdges,
  type MemoryGraph,
} from './edges.js';
import { createGraph } from './structure.js';

describe('Graph Edges', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edges-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('addEdge', () => {
    it('should add edge between two nodes', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'learning' },
        ],
        edges: [],
      };

      const updated = addEdge(graph, 'node-1', 'node-2', 'relates-to');

      expect(updated.edges).toHaveLength(1);
      expect(updated.edges[0]).toEqual({
        source: 'node-1',
        target: 'node-2',
        label: 'relates-to',
      });
    });

    it('should use default label if not specified', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'learning' },
        ],
        edges: [],
      };

      const updated = addEdge(graph, 'node-1', 'node-2');

      expect(updated.edges[0].label).toBe('relates-to');
    });

    it('should not add duplicate edge', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'learning' },
        ],
        edges: [{ source: 'node-1', target: 'node-2', label: 'relates-to' }],
      };

      const updated = addEdge(graph, 'node-1', 'node-2', 'relates-to');

      expect(updated.edges).toHaveLength(1);
    });

    it('should allow multiple edges with different labels', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'learning' },
        ],
        edges: [{ source: 'node-1', target: 'node-2', label: 'relates-to' }],
      };

      const updated = addEdge(graph, 'node-1', 'node-2', 'informed-by');

      expect(updated.edges).toHaveLength(2);
    });

    it('should throw error if source node does not exist', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'node-2', type: 'learning' }],
        edges: [],
      };

      expect(() => addEdge(graph, 'missing', 'node-2')).toThrow(
        'Source node not found'
      );
    });

    it('should throw error if target node does not exist', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'node-1', type: 'decision' }],
        edges: [],
      };

      expect(() => addEdge(graph, 'node-1', 'missing')).toThrow(
        'Target node not found'
      );
    });

    it('should prevent self-referencing edges', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'node-1', type: 'decision' }],
        edges: [],
      };

      expect(() => addEdge(graph, 'node-1', 'node-1')).toThrow(
        'Cannot create self-referencing edge'
      );
    });
  });

  describe('removeEdge', () => {
    it('should remove edge between nodes', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'learning' },
        ],
        edges: [{ source: 'node-1', target: 'node-2', label: 'relates-to' }],
      };

      const updated = removeEdge(graph, 'node-1', 'node-2');

      expect(updated.edges).toHaveLength(0);
    });

    it('should remove edge with specific label only', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'learning' },
        ],
        edges: [
          { source: 'node-1', target: 'node-2', label: 'relates-to' },
          { source: 'node-1', target: 'node-2', label: 'informed-by' },
        ],
      };

      const updated = removeEdge(graph, 'node-1', 'node-2', 'relates-to');

      expect(updated.edges).toHaveLength(1);
      expect(updated.edges[0].label).toBe('informed-by');
    });

    it('should remove all edges between nodes if no label specified', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'learning' },
        ],
        edges: [
          { source: 'node-1', target: 'node-2', label: 'relates-to' },
          { source: 'node-1', target: 'node-2', label: 'informed-by' },
        ],
      };

      const updated = removeEdge(graph, 'node-1', 'node-2');

      expect(updated.edges).toHaveLength(0);
    });

    it('should handle non-existent edge gracefully', () => {
      const graph = createGraph();

      const updated = removeEdge(graph, 'a', 'b');

      expect(updated.edges).toEqual([]);
    });
  });

  describe('getEdges', () => {
    it('should return all edges', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [
          { source: 'a', target: 'b', label: 'x' },
          { source: 'b', target: 'c', label: 'y' },
        ],
      };

      const edges = getEdges(graph);

      expect(edges).toHaveLength(2);
    });
  });

  describe('getInboundEdges', () => {
    it('should return edges pointing to node', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [
          { source: 'a', target: 'b', label: 'x' },
          { source: 'c', target: 'b', label: 'y' },
          { source: 'b', target: 'd', label: 'z' },
        ],
      };

      const inbound = getInboundEdges(graph, 'b');

      expect(inbound).toHaveLength(2);
      expect(inbound.every(e => e.target === 'b')).toBe(true);
    });

    it('should return empty array for node with no inbound edges', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [{ source: 'a', target: 'b', label: 'x' }],
      };

      const inbound = getInboundEdges(graph, 'a');

      expect(inbound).toEqual([]);
    });
  });

  describe('getOutboundEdges', () => {
    it('should return edges originating from node', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [
          { source: 'a', target: 'b', label: 'x' },
          { source: 'a', target: 'c', label: 'y' },
          { source: 'b', target: 'c', label: 'z' },
        ],
      };

      const outbound = getOutboundEdges(graph, 'a');

      expect(outbound).toHaveLength(2);
      expect(outbound.every(e => e.source === 'a')).toBe(true);
    });

    it('should return empty array for node with no outbound edges', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [{ source: 'a', target: 'b', label: 'x' }],
      };

      const outbound = getOutboundEdges(graph, 'b');

      expect(outbound).toEqual([]);
    });
  });

  describe('hasEdge', () => {
    it('should return true if edge exists', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [{ source: 'a', target: 'b', label: 'relates-to' }],
      };

      expect(hasEdge(graph, 'a', 'b')).toBe(true);
    });

    it('should return false if edge does not exist', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [{ source: 'a', target: 'b', label: 'relates-to' }],
      };

      expect(hasEdge(graph, 'b', 'a')).toBe(false);
    });

    it('should check specific label if provided', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [{ source: 'a', target: 'b', label: 'relates-to' }],
      };

      expect(hasEdge(graph, 'a', 'b', 'relates-to')).toBe(true);
      expect(hasEdge(graph, 'a', 'b', 'informed-by')).toBe(false);
    });
  });

  describe('getAllEdgesForNode', () => {
    it('should return both inbound and outbound edges', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [
          { source: 'a', target: 'b', label: 'x' },
          { source: 'b', target: 'c', label: 'y' },
          { source: 'd', target: 'b', label: 'z' },
        ],
      };

      const edges = getAllEdgesForNode(graph, 'b');

      expect(edges).toHaveLength(3);
    });

    it('should return empty array for unconnected node', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'lonely', type: 'decision' }],
        edges: [{ source: 'a', target: 'b', label: 'x' }],
      };

      const edges = getAllEdgesForNode(graph, 'lonely');

      expect(edges).toEqual([]);
    });
  });

  describe('getNeighbours', () => {
    it('should return all connected node IDs', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [
          { source: 'a', target: 'b', label: 'x' },
          { source: 'a', target: 'c', label: 'y' },
          { source: 'd', target: 'a', label: 'z' },
        ],
      };

      const neighbours = getNeighbours(graph, 'a');

      expect(neighbours).toHaveLength(3);
      expect(neighbours).toContain('b');
      expect(neighbours).toContain('c');
      expect(neighbours).toContain('d');
    });

    it('should not duplicate neighbours with multiple edges', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [
          { source: 'a', target: 'b', label: 'x' },
          { source: 'a', target: 'b', label: 'y' },
        ],
      };

      const neighbours = getNeighbours(graph, 'a');

      expect(neighbours).toHaveLength(1);
      expect(neighbours).toContain('b');
    });

    it('should return empty array for unconnected node', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [],
      };

      const neighbours = getNeighbours(graph, 'lonely');

      expect(neighbours).toEqual([]);
    });
  });

  describe('getNodeDegree', () => {
    it('should return total number of edges connected to node', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [
          { source: 'a', target: 'b', label: 'x' },
          { source: 'a', target: 'c', label: 'y' },
          { source: 'd', target: 'a', label: 'z' },
        ],
      };

      expect(getNodeDegree(graph, 'a')).toBe(3);
    });

    it('should return 0 for unconnected node', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [],
      };

      expect(getNodeDegree(graph, 'lonely')).toBe(0);
    });
  });

  describe('findOrphanedNodes', () => {
    it('should find nodes with no edges', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'connected', type: 'decision' },
          { id: 'orphan1', type: 'learning' },
          { id: 'orphan2', type: 'gotcha' },
        ],
        edges: [{ source: 'connected', target: 'other', label: 'x' }],
      };

      const orphans = findOrphanedNodes(graph);

      expect(orphans).toHaveLength(2);
      expect(orphans).toContain('orphan1');
      expect(orphans).toContain('orphan2');
    });

    it('should return empty array when all nodes connected', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'a', type: 'decision' },
          { id: 'b', type: 'learning' },
        ],
        edges: [{ source: 'a', target: 'b', label: 'x' }],
      };

      const orphans = findOrphanedNodes(graph);

      expect(orphans).toEqual([]);
    });

    it('should return empty array for empty graph', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [],
      };

      const orphans = findOrphanedNodes(graph);

      expect(orphans).toEqual([]);
    });
  });

  describe('bulkAddEdges', () => {
    it('should add multiple edges at once', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'a', type: 'decision' },
          { id: 'b', type: 'learning' },
          { id: 'c', type: 'gotcha' },
        ],
        edges: [],
      };

      const updated = bulkAddEdges(graph, [
        { source: 'a', target: 'b', label: 'relates-to' },
        { source: 'b', target: 'c', label: 'informed-by' },
      ]);

      expect(updated.edges).toHaveLength(2);
    });

    it('should skip invalid edges silently', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'a', type: 'decision' },
          { id: 'b', type: 'learning' },
        ],
        edges: [],
      };

      const updated = bulkAddEdges(graph, [
        { source: 'a', target: 'b', label: 'valid' },
        { source: 'missing', target: 'b', label: 'invalid' },
        { source: 'a', target: 'missing', label: 'invalid' },
      ]);

      expect(updated.edges).toHaveLength(1);
      expect(updated.edges[0].label).toBe('valid');
    });

    it('should handle empty edges array', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [],
        edges: [],
      };

      const updated = bulkAddEdges(graph, []);

      expect(updated.edges).toEqual([]);
    });
  });
});
