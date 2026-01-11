/**
 * Integration Test: Graph Traversal Stress Tests
 *
 * Tests graph traversal under stress conditions:
 * - Circular dependencies
 * - Deep nesting
 * - Disconnected components
 * - Large graphs
 */

import { describe, it, expect } from 'vitest';
import {
  createGraph,
  addNode,
} from '../../skills/memory/src/graph/structure.js';
import { addEdge } from '../../skills/memory/src/graph/edges.js';
import {
  bfsTraversal,
  dfsTraversal,
  findShortestPath,
  findConnectedComponents,
  calculateImpact,
} from '../../skills/memory/src/graph/traversal.js';

describe('Graph Traversal Stress Tests', () => {
  describe('Circular Dependencies', () => {
    it('should handle simple circular dependency', () => {
      let graph = createGraph();
      graph = addNode(graph, { id: 'node-a', type: 'decision' });
      graph = addNode(graph, { id: 'node-b', type: 'learning' });
      graph = addEdge(graph, 'node-a', 'node-b', 'relates-to');
      graph = addEdge(graph, 'node-b', 'node-a', 'relates-to');

      const bfs = bfsTraversal(graph, 'node-a');
      expect(bfs.visited).toContain('node-a');
      expect(bfs.visited).toContain('node-b');
      expect(bfs.visited.length).toBe(2); // Should visit each node once
    });

    it('should handle three-way circular dependency', () => {
      let graph = createGraph();
      graph = addNode(graph, { id: 'node-a', type: 'decision' });
      graph = addNode(graph, { id: 'node-b', type: 'learning' });
      graph = addNode(graph, { id: 'node-c', type: 'artifact' });

      graph = addEdge(graph, 'node-a', 'node-b', 'relates-to');
      graph = addEdge(graph, 'node-b', 'node-c', 'relates-to');
      graph = addEdge(graph, 'node-c', 'node-a', 'relates-to');

      const dfs = dfsTraversal(graph, 'node-a');
      expect(dfs.visited.length).toBe(3);
      expect(new Set(dfs.visited).size).toBe(3); // No duplicates
    });

    it('should reject self-referencing edges', () => {
      let graph = createGraph();
      graph = addNode(graph, { id: 'node-self', type: 'decision' });

      // Implementation prevents self-referencing edges
      expect(() => {
        addEdge(graph, 'node-self', 'node-self', 'self-ref');
      }).toThrow('Cannot create self-referencing edge');

      // Traversal of single node should still work
      const bfs = bfsTraversal(graph, 'node-self');
      expect(bfs.visited).toEqual(['node-self']);
    });

    it('should find shortest path in circular graph', () => {
      let graph = createGraph();
      for (let i = 0; i < 5; i++) {
        graph = addNode(graph, { id: `node-${i}`, type: 'learning' });
      }

      // Create circle: 0 -> 1 -> 2 -> 3 -> 4 -> 0
      for (let i = 0; i < 5; i++) {
        graph = addEdge(graph, `node-${i}`, `node-${(i + 1) % 5}`, 'next');
      }

      // Also add direct path: 0 -> 2
      graph = addEdge(graph, 'node-0', 'node-2', 'shortcut');

      const path = findShortestPath(graph, 'node-0', 'node-2');
      expect(path).toEqual(['node-0', 'node-2']); // Should find shortcut
    });
  });

  describe('Deep Nesting', () => {
    it('should handle deeply nested linear graph', () => {
      let graph = createGraph();
      const depth = 100;

      for (let i = 0; i < depth; i++) {
        graph = addNode(graph, { id: `node-${i}`, type: 'learning' });
      }

      for (let i = 0; i < depth - 1; i++) {
        graph = addEdge(graph, `node-${i}`, `node-${i + 1}`, 'next');
      }

      const bfs = bfsTraversal(graph, 'node-0');
      expect(bfs.visited.length).toBe(depth);
      expect(bfs.depths.get('node-99')).toBe(99);
    });

    it('should respect maxDepth in deep graph', () => {
      let graph = createGraph();

      for (let i = 0; i < 50; i++) {
        graph = addNode(graph, { id: `node-${i}`, type: 'learning' });
      }

      for (let i = 0; i < 49; i++) {
        graph = addEdge(graph, `node-${i}`, `node-${i + 1}`, 'next');
      }

      const bfs = bfsTraversal(graph, 'node-0', 10);
      expect(bfs.visited.length).toBe(11); // Depth 0-10 inclusive
      expect(bfs.depths.get('node-10')).toBe(10);
      expect(bfs.depths.has('node-11')).toBe(false);
    });

    it('should handle exponentially branching graph', () => {
      let graph = createGraph();
      const totalNodes = 31; // 2^5 - 1 = 31 nodes for a complete binary tree of depth 5

      // Create all nodes first
      for (let i = 0; i < totalNodes; i++) {
        graph = addNode(graph, { id: `node-${i}`, type: 'learning' });
      }

      // Add edges using binary tree indexing: left child = 2i+1, right child = 2i+2
      for (let i = 0; i < 15; i++) { // Only nodes 0-14 have children (15 internal nodes)
        const leftChild = 2 * i + 1;
        const rightChild = 2 * i + 2;

        if (leftChild < totalNodes) {
          graph = addEdge(graph, `node-${i}`, `node-${leftChild}`, 'left');
        }
        if (rightChild < totalNodes) {
          graph = addEdge(graph, `node-${i}`, `node-${rightChild}`, 'right');
        }
      }

      const bfs = bfsTraversal(graph, 'node-0');
      expect(bfs.visited.length).toBe(31); // All nodes reachable from root
    });
  });

  describe('Disconnected Components', () => {
    it('should identify multiple disconnected components', () => {
      let graph = createGraph();

      // Component 1: A -> B -> C
      graph = addNode(graph, { id: 'a', type: 'decision' });
      graph = addNode(graph, { id: 'b', type: 'learning' });
      graph = addNode(graph, { id: 'c', type: 'artifact' });
      graph = addEdge(graph, 'a', 'b', 'relates-to');
      graph = addEdge(graph, 'b', 'c', 'relates-to');

      // Component 2: X -> Y
      graph = addNode(graph, { id: 'x', type: 'decision' });
      graph = addNode(graph, { id: 'y', type: 'learning' });
      graph = addEdge(graph, 'x', 'y', 'relates-to');

      // Component 3: Z (isolated)
      graph = addNode(graph, { id: 'z', type: 'gotcha' });

      const components = findConnectedComponents(graph);
      expect(components.length).toBe(3);

      const componentSizes = components.map(c => c.length).sort();
      expect(componentSizes).toEqual([1, 2, 3]);
    });

    it('should handle traversal starting from disconnected node', () => {
      let graph = createGraph();

      // Create two separate chains
      graph = addNode(graph, { id: 'chain1-a', type: 'decision' });
      graph = addNode(graph, { id: 'chain1-b', type: 'learning' });
      graph = addEdge(graph, 'chain1-a', 'chain1-b', 'next');

      graph = addNode(graph, { id: 'chain2-x', type: 'decision' });
      graph = addNode(graph, { id: 'chain2-y', type: 'learning' });
      graph = addEdge(graph, 'chain2-x', 'chain2-y', 'next');

      // Traverse from chain1, should not reach chain2
      const bfs = bfsTraversal(graph, 'chain1-a');
      expect(bfs.visited).toContain('chain1-a');
      expect(bfs.visited).toContain('chain1-b');
      expect(bfs.visited).not.toContain('chain2-x');
      expect(bfs.visited).not.toContain('chain2-y');
    });

    it('should find no path between disconnected components', () => {
      let graph = createGraph();

      graph = addNode(graph, { id: 'a', type: 'decision' });
      graph = addNode(graph, { id: 'b', type: 'learning' });

      const path = findShortestPath(graph, 'a', 'b');
      expect(path).toBeNull();
    });
  });

  describe('Large Graph Performance', () => {
    it('should handle graph with 1000 nodes efficiently', () => {
      let graph = createGraph();

      // Create 1000 nodes
      for (let i = 0; i < 1000; i++) {
        graph = addNode(graph, { id: `node-${i}`, type: 'learning' });
      }

      // Create edges (each node connects to next 5 nodes)
      for (let i = 0; i < 995; i++) {
        for (let j = i + 1; j < Math.min(i + 6, 1000); j++) {
          graph = addEdge(graph, `node-${i}`, `node-${j}`, 'relates-to');
        }
      }

      const startTime = Date.now();
      const bfs = bfsTraversal(graph, 'node-0');
      const duration = Date.now() - startTime;

      expect(bfs.visited.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle finding components in large graph', () => {
      let graph = createGraph();

      // Create 100 small disconnected components
      for (let comp = 0; comp < 100; comp++) {
        for (let node = 0; node < 5; node++) {
          const id = `comp${comp}-node${node}`;
          graph = addNode(graph, { id, type: 'learning' });

          if (node > 0) {
            graph = addEdge(graph, `comp${comp}-node${node - 1}`, id, 'next');
          }
        }
      }

      const startTime = Date.now();
      const components = findConnectedComponents(graph);
      const duration = Date.now() - startTime;

      expect(components.length).toBe(100);
      expect(components.every(c => c.length === 5)).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });

  describe('Complex Topology', () => {
    it('should handle diamond dependency pattern', () => {
      let graph = createGraph();
      graph = addNode(graph, { id: 'top', type: 'decision' });
      graph = addNode(graph, { id: 'left', type: 'learning' });
      graph = addNode(graph, { id: 'right', type: 'learning' });
      graph = addNode(graph, { id: 'bottom', type: 'artifact' });

      graph = addEdge(graph, 'top', 'left', 'relates-to');
      graph = addEdge(graph, 'top', 'right', 'relates-to');
      graph = addEdge(graph, 'left', 'bottom', 'relates-to');
      graph = addEdge(graph, 'right', 'bottom', 'relates-to');

      const path = findShortestPath(graph, 'top', 'bottom');
      expect(path).toBeDefined();
      expect(path?.length).toBe(3); // top -> (left or right) -> bottom
    });

    it('should calculate impact of removing hub node', () => {
      let graph = createGraph();
      graph = addNode(graph, { id: 'hub', type: 'decision' });

      // Add spokes
      for (let i = 0; i < 10; i++) {
        graph = addNode(graph, { id: `spoke-${i}`, type: 'learning' });
        graph = addEdge(graph, 'hub', `spoke-${i}`, 'relates-to');
      }

      const impact = calculateImpact(graph, 'hub');
      expect(impact.brokenEdges).toBe(10);
      expect(impact.orphanedNodes.length).toBeLessThanOrEqual(10);
    });

    it('should handle fully connected graph', () => {
      let graph = createGraph();
      const nodeCount = 10;

      // Create nodes
      for (let i = 0; i < nodeCount; i++) {
        graph = addNode(graph, { id: `node-${i}`, type: 'learning' });
      }

      // Connect every node to every other node
      for (let i = 0; i < nodeCount; i++) {
        for (let j = 0; j < nodeCount; j++) {
          if (i !== j) {
            graph = addEdge(graph, `node-${i}`, `node-${j}`, 'relates-to');
          }
        }
      }

      const bfs = bfsTraversal(graph, 'node-0');
      expect(bfs.visited.length).toBe(nodeCount);

      // In fully connected graph, everything is at depth 1
      const depths = Array.from(bfs.depths.values());
      expect(depths.filter(d => d === 0).length).toBe(1); // Start node
      expect(depths.filter(d => d === 1).length).toBe(9); // All others
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty graph', () => {
      const graph = createGraph();

      const components = findConnectedComponents(graph);
      expect(components).toEqual([]);
    });

    it('should handle single node graph', () => {
      let graph = createGraph();
      graph = addNode(graph, { id: 'only-node', type: 'decision' });

      const bfs = bfsTraversal(graph, 'only-node');
      expect(bfs.visited).toEqual(['only-node']);

      const components = findConnectedComponents(graph);
      expect(components).toEqual([['only-node']]);
    });

    it('should handle traversal from non-existent node', () => {
      let graph = createGraph();
      graph = addNode(graph, { id: 'exists', type: 'decision' });

      // BFS visits the start node even if it doesn't exist in graph
      // (it just won't find any outbound edges)
      const bfs = bfsTraversal(graph, 'does-not-exist');
      expect(bfs.visited).toEqual(['does-not-exist']);
      expect(bfs.depths.get('does-not-exist')).toBe(0);
    });

    it('should handle path finding with same source and target', () => {
      let graph = createGraph();
      graph = addNode(graph, { id: 'node-a', type: 'decision' });

      const path = findShortestPath(graph, 'node-a', 'node-a');
      expect(path).toEqual(['node-a']);
    });
  });
});
