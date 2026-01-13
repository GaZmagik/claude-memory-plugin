/**
 * Property-Based Tests for Graph Traversal Functions
 *
 * Validates mathematical properties of graph traversal algorithms.
 */

import { describe, it, expect } from 'vitest';
import {
  bfsTraversal,
  dfsTraversal,
  findReachable,
  findShortestPath,
  findConnectedComponents,
  getSubgraph,
} from './traversal.js';
import type { MemoryGraph } from './structure.js';

// Helper to create test graphs
function createGraph(nodeIds: string[], edges: Array<[string, string]>): MemoryGraph {
  return {
    version: 1,
    nodes: nodeIds.map(id => ({ id, type: 'learning' })),
    edges: edges.map(([source, target]) => ({ source, target, label: 'related' })),
  };
}

describe('Graph Traversal Properties', () => {
  describe('bfsTraversal', () => {
    it('should always include start node as first element', () => {
      const graphs = [
        createGraph(['a'], []),
        createGraph(['a', 'b'], [['a', 'b']]),
        createGraph(['a', 'b', 'c'], [['a', 'b'], ['a', 'c']]),
      ];

      for (const graph of graphs) {
        const result = bfsTraversal(graph, 'a');
        expect(result.visited[0]).toBe('a');
      }
    });

    it('should never contain duplicate nodes', () => {
      const graph = createGraph(
        ['a', 'b', 'c', 'd'],
        [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']] // Diamond pattern
      );

      const result = bfsTraversal(graph, 'a');
      const uniqueNodes = new Set(result.visited);
      expect(result.visited.length).toBe(uniqueNodes.size);
    });

    it('should respect maxDepth constraint', () => {
      // Chain: a -> b -> c -> d -> e
      const graph = createGraph(
        ['a', 'b', 'c', 'd', 'e'],
        [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e']]
      );

      const result = bfsTraversal(graph, 'a', 2);

      // Should only reach a, b, c (depths 0, 1, 2)
      expect(result.visited.length).toBe(3);
      expect(result.visited).toContain('a');
      expect(result.visited).toContain('b');
      expect(result.visited).toContain('c');
      expect(result.visited).not.toContain('d');
    });

    it('should assign monotonically increasing depths', () => {
      const graph = createGraph(
        ['a', 'b', 'c', 'd'],
        [['a', 'b'], ['b', 'c'], ['c', 'd']]
      );

      const result = bfsTraversal(graph, 'a');

      // Start node has depth 0
      expect(result.depths.get('a')).toBe(0);

      // Subsequent nodes have increasing depths
      for (let i = 1; i < result.visited.length; i++) {
        const node = result.visited[i];
        const depth = result.depths.get(node)!;
        expect(depth).toBeGreaterThan(0);
      }
    });
  });

  describe('dfsTraversal', () => {
    it('should always include start node as first element', () => {
      const graph = createGraph(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
      const result = dfsTraversal(graph, 'a');
      expect(result.visited[0]).toBe('a');
    });

    it('should never contain duplicate nodes', () => {
      const graph = createGraph(
        ['a', 'b', 'c', 'd'],
        [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']]
      );

      const result = dfsTraversal(graph, 'a');
      const uniqueNodes = new Set(result.visited);
      expect(result.visited.length).toBe(uniqueNodes.size);
    });

    it('should visit same nodes as BFS (just different order)', () => {
      const graph = createGraph(
        ['a', 'b', 'c', 'd'],
        [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']]
      );

      const bfsResult = bfsTraversal(graph, 'a');
      const dfsResult = dfsTraversal(graph, 'a');

      // Same nodes, possibly different order
      expect(new Set(bfsResult.visited)).toEqual(new Set(dfsResult.visited));
    });
  });

  describe('findShortestPath', () => {
    it('should return [node] for path to self', () => {
      const graph = createGraph(['a', 'b'], [['a', 'b']]);
      const path = findShortestPath(graph, 'a', 'a');
      expect(path).toEqual(['a']);
    });

    it('should return valid path where all edges exist', () => {
      const graph = createGraph(
        ['a', 'b', 'c', 'd'],
        [['a', 'b'], ['b', 'c'], ['c', 'd']]
      );

      const path = findShortestPath(graph, 'a', 'd');
      expect(path).not.toBeNull();

      // Verify all edges in path exist
      for (let i = 0; i < path!.length - 1; i++) {
        const source = path![i];
        const target = path![i + 1];
        const edgeExists = graph.edges.some(e => e.source === source && e.target === target);
        expect(edgeExists).toBe(true);
      }
    });

    it('should return null for unreachable nodes', () => {
      const graph = createGraph(['a', 'b'], []); // No edges
      const path = findShortestPath(graph, 'a', 'b');
      expect(path).toBeNull();
    });

    it('should find shortest path when multiple paths exist', () => {
      // a -> b -> c -> d (length 3)
      // a -> d (length 1)
      const graph = createGraph(
        ['a', 'b', 'c', 'd'],
        [['a', 'b'], ['b', 'c'], ['c', 'd'], ['a', 'd']]
      );

      const path = findShortestPath(graph, 'a', 'd');
      expect(path).toEqual(['a', 'd']); // Shortest path
    });
  });

  describe('findConnectedComponents', () => {
    it('should return empty array for empty graph', () => {
      const graph = createGraph([], []);
      const components = findConnectedComponents(graph);
      expect(components).toEqual([]);
    });

    it('should return each node as separate component if no edges', () => {
      const graph = createGraph(['a', 'b', 'c'], []);
      const components = findConnectedComponents(graph);
      expect(components.length).toBe(3);
    });

    it('should partition nodes into disjoint sets', () => {
      // Two separate components: {a, b} and {c, d}
      const graph = createGraph(
        ['a', 'b', 'c', 'd'],
        [['a', 'b'], ['c', 'd']]
      );

      const components = findConnectedComponents(graph);
      expect(components.length).toBe(2);

      // Components should be disjoint
      const allNodes = components.flat();
      const uniqueNodes = new Set(allNodes);
      expect(allNodes.length).toBe(uniqueNodes.size);
    });

    it('should cover all nodes', () => {
      const graph = createGraph(
        ['a', 'b', 'c', 'd', 'e'],
        [['a', 'b'], ['c', 'd']]
      );

      const components = findConnectedComponents(graph);
      const allNodes = new Set(components.flat());

      expect(allNodes.size).toBe(graph.nodes.length);
      for (const node of graph.nodes) {
        expect(allNodes.has(node.id)).toBe(true);
      }
    });
  });

  describe('getSubgraph', () => {
    it('should only include nodes within maxDepth', () => {
      const graph = createGraph(
        ['a', 'b', 'c', 'd', 'e'],
        [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e']]
      );

      const subgraph = getSubgraph(graph, 'a', 2);

      expect(subgraph.nodes.map(n => n.id)).toContain('a');
      expect(subgraph.nodes.map(n => n.id)).toContain('b');
      expect(subgraph.nodes.map(n => n.id)).toContain('c');
      expect(subgraph.nodes.map(n => n.id)).not.toContain('d');
    });

    it('should only include edges between included nodes', () => {
      const graph = createGraph(
        ['a', 'b', 'c', 'd'],
        [['a', 'b'], ['b', 'c'], ['c', 'd']]
      );

      const subgraph = getSubgraph(graph, 'a', 1);

      // Should include a -> b edge
      expect(subgraph.edges.some(e => e.source === 'a' && e.target === 'b')).toBe(true);

      // Should NOT include b -> c edge (c is at depth 2)
      expect(subgraph.edges.some(e => e.source === 'b' && e.target === 'c')).toBe(false);
    });

    it('should return valid graph structure', () => {
      const graph = createGraph(
        ['a', 'b', 'c'],
        [['a', 'b'], ['b', 'c']]
      );

      const subgraph = getSubgraph(graph, 'a', 10);

      expect(subgraph.version).toBeDefined();
      expect(Array.isArray(subgraph.nodes)).toBe(true);
      expect(Array.isArray(subgraph.edges)).toBe(true);
    });
  });

  describe('findReachable', () => {
    it('should always include start node (reflexivity)', () => {
      const graph = createGraph(['a'], []);
      const reachable = findReachable(graph, 'a');
      expect(reachable).toContain('a');
    });

    it('should respect edge direction (no reverse traversal)', () => {
      const graph = createGraph(['a', 'b'], [['a', 'b']]); // a -> b only

      const reachableFromA = findReachable(graph, 'a');
      const reachableFromB = findReachable(graph, 'b');

      expect(reachableFromA).toContain('b');
      expect(reachableFromB).not.toContain('a'); // Cannot go backwards
    });

    it('should be transitive', () => {
      // a -> b -> c
      const graph = createGraph(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);

      const reachable = findReachable(graph, 'a');
      expect(reachable).toContain('c'); // Transitive reachability
    });
  });
});
