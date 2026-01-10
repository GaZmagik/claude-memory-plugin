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
  hasEdge,
  type MemoryGraph,
  type GraphEdge,
} from '../../../skills/memory/src/graph/edges.js';
import { createGraph } from '../../../skills/memory/src/graph/structure.js';

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
});
