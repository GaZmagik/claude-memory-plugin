/**
 * Tests for T071: Graph Traversal
 */

import { describe, it, expect } from 'vitest';
import {
  bfsTraversal,
  dfsTraversal,
  findReachable,
  findPredecessors,
  findShortestPath,
  getSubgraph,
  findConnectedComponents,
  calculateImpact,
} from '../../../skills/memory/src/graph/traversal.js';
import type { MemoryGraph } from '../../../skills/memory/src/graph/structure.js';

describe('bfsTraversal', () => {
  const linearGraph: MemoryGraph = {
    version: 1,
    nodes: [
      { id: 'a', type: 'hub' },
      { id: 'b', type: 'hub' },
      { id: 'c', type: 'hub' },
    ],
    edges: [
      { source: 'a', target: 'b', label: '' },
      { source: 'b', target: 'c', label: '' },
    ],
  };

  const branchingGraph: MemoryGraph = {
    version: 1,
    nodes: [
      { id: 'root', type: 'hub' },
      { id: 'left', type: 'hub' },
      { id: 'right', type: 'hub' },
      { id: 'leaf1', type: 'hub' },
      { id: 'leaf2', type: 'hub' },
    ],
    edges: [
      { source: 'root', target: 'left', label: '' },
      { source: 'root', target: 'right', label: '' },
      { source: 'left', target: 'leaf1', label: '' },
      { source: 'right', target: 'leaf2', label: '' },
    ],
  };

  it('should traverse graph breadth-first', () => {
    const result = bfsTraversal(branchingGraph, 'root');

    expect(result.visited).toContain('root');
    expect(result.visited).toContain('left');
    expect(result.visited).toContain('right');

    // In BFS, left and right should come before leaf1 and leaf2
    const leftIndex = result.visited.indexOf('left');
    const rightIndex = result.visited.indexOf('right');
    const leaf1Index = result.visited.indexOf('leaf1');
    const leaf2Index = result.visited.indexOf('leaf2');

    expect(leftIndex).toBeLessThan(leaf1Index);
    expect(rightIndex).toBeLessThan(leaf2Index);
  });

  it('should track visited nodes in order', () => {
    const result = bfsTraversal(linearGraph, 'a');

    expect(result.visited).toEqual(['a', 'b', 'c']);
  });

  it('should track depth of each node', () => {
    const result = bfsTraversal(branchingGraph, 'root');

    expect(result.depths.get('root')).toBe(0);
    expect(result.depths.get('left')).toBe(1);
    expect(result.depths.get('right')).toBe(1);
    expect(result.depths.get('leaf1')).toBe(2);
    expect(result.depths.get('leaf2')).toBe(2);
  });

  it('should respect max depth', () => {
    const result = bfsTraversal(branchingGraph, 'root', 1);

    expect(result.visited).toContain('root');
    expect(result.visited).toContain('left');
    expect(result.visited).toContain('right');
    expect(result.visited).not.toContain('leaf1');
    expect(result.visited).not.toContain('leaf2');
  });

  it('should handle cycles without infinite loop', () => {
    const cyclicGraph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
        { id: 'c', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'b', label: '' },
        { source: 'b', target: 'c', label: '' },
        { source: 'c', target: 'a', label: '' },
      ],
    };

    const result = bfsTraversal(cyclicGraph, 'a');

    // Should visit each node exactly once
    expect(result.visited.length).toBe(3);
    expect(result.visited).toContain('a');
    expect(result.visited).toContain('b');
    expect(result.visited).toContain('c');
  });

  it('should handle disconnected starting node', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'isolated', type: 'hub' },
        { id: 'other', type: 'hub' },
      ],
      edges: [],
    };

    const result = bfsTraversal(graph, 'isolated');

    expect(result.visited).toEqual(['isolated']);
    expect(result.depths.get('isolated')).toBe(0);
  });
});

describe('dfsTraversal', () => {
  const branchingGraph: MemoryGraph = {
    version: 1,
    nodes: [
      { id: 'root', type: 'hub' },
      { id: 'left', type: 'hub' },
      { id: 'right', type: 'hub' },
      { id: 'leaf1', type: 'hub' },
      { id: 'leaf2', type: 'hub' },
    ],
    edges: [
      { source: 'root', target: 'left', label: '' },
      { source: 'root', target: 'right', label: '' },
      { source: 'left', target: 'leaf1', label: '' },
      { source: 'right', target: 'leaf2', label: '' },
    ],
  };

  it('should traverse graph depth-first', () => {
    const result = dfsTraversal(branchingGraph, 'root');

    expect(result.visited).toContain('root');
    expect(result.visited).toContain('left');
    expect(result.visited).toContain('leaf1');

    // In DFS, should go deep before wide
    // root -> left -> leaf1 before visiting right
    const rootIndex = result.visited.indexOf('root');
    const leftIndex = result.visited.indexOf('left');
    const leaf1Index = result.visited.indexOf('leaf1');
    const rightIndex = result.visited.indexOf('right');

    expect(leftIndex).toBeGreaterThan(rootIndex);
    expect(leaf1Index).toBeGreaterThan(leftIndex);
    expect(leaf1Index).toBeLessThan(rightIndex); // Go deep first
  });

  it('should track visited nodes in DFS order', () => {
    const linearGraph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
        { id: 'c', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'b', label: '' },
        { source: 'b', target: 'c', label: '' },
      ],
    };

    const result = dfsTraversal(linearGraph, 'a');

    expect(result.visited).toEqual(['a', 'b', 'c']);
  });

  it('should respect max depth', () => {
    const result = dfsTraversal(branchingGraph, 'root', 1);

    expect(result.visited).toContain('root');
    expect(result.visited).toContain('left');
    expect(result.visited).toContain('right');
    expect(result.visited).not.toContain('leaf1');
    expect(result.visited).not.toContain('leaf2');
  });

  it('should handle cycles without infinite recursion', () => {
    const cyclicGraph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
        { id: 'c', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'b', label: '' },
        { source: 'b', target: 'c', label: '' },
        { source: 'c', target: 'a', label: '' },
      ],
    };

    const result = dfsTraversal(cyclicGraph, 'a');

    // Should visit each node exactly once
    expect(result.visited.length).toBe(3);
    expect(result.visited).toContain('a');
    expect(result.visited).toContain('b');
    expect(result.visited).toContain('c');
  });
});

describe('findReachable', () => {
  it('should find all nodes reachable from start', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
        { id: 'c', type: 'hub' },
        { id: 'isolated', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'b', label: '' },
        { source: 'b', target: 'c', label: '' },
      ],
    };

    const result = findReachable(graph, 'a');

    expect(result).toContain('a');
    expect(result).toContain('b');
    expect(result).toContain('c');
    expect(result).not.toContain('isolated');
  });

  it('should return only starting node when isolated', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'isolated', type: 'hub' },
        { id: 'other', type: 'hub' },
      ],
      edges: [],
    };

    const result = findReachable(graph, 'isolated');

    expect(result).toEqual(['isolated']);
  });

  it('should handle large connected graphs', () => {
    // Create a chain of 100 nodes
    const nodes = Array.from({ length: 100 }, (_, i) => ({ id: `node${i}`, type: 'hub' }));
    const edges = Array.from({ length: 99 }, (_, i) => ({
      source: `node${i}`,
      target: `node${i + 1}`,
      label: '',
    }));

    const graph: MemoryGraph = { version: 1, nodes, edges };

    const result = findReachable(graph, 'node0');

    expect(result.length).toBe(100);
    expect(result).toContain('node0');
    expect(result).toContain('node99');
  });
});

describe('findPredecessors', () => {
  it('should find all nodes that can reach target', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
        { id: 'c', type: 'hub' },
        { id: 'd', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'c', label: '' },
        { source: 'b', target: 'c', label: '' },
        { source: 'c', target: 'd', label: '' },
      ],
    };

    const result = findPredecessors(graph, 'd');

    expect(result).toContain('d'); // Target itself
    expect(result).toContain('c');
    expect(result).toContain('a');
    expect(result).toContain('b');
  });

  it('should traverse in reverse direction', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'b', label: '' },
      ],
    };

    const result = findPredecessors(graph, 'b');

    expect(result).toContain('b');
    expect(result).toContain('a');
  });

  it('should handle node with no predecessors', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'root', type: 'hub' },
        { id: 'child', type: 'hub' },
      ],
      edges: [
        { source: 'root', target: 'child', label: '' },
      ],
    };

    const result = findPredecessors(graph, 'root');

    expect(result).toEqual(['root']);
  });
});

describe('findShortestPath', () => {
  it('should find shortest path between two nodes', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
        { id: 'c', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'b', label: '' },
        { source: 'b', target: 'c', label: '' },
      ],
    };

    const result = findShortestPath(graph, 'a', 'c');

    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should return single node path when source equals target', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [{ id: 'a', type: 'hub' }],
      edges: [],
    };

    const result = findShortestPath(graph, 'a', 'a');
    expect(result).toEqual(['a']);
  });

  it('should return null when no path exists', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'isolated', type: 'hub' },
      ],
      edges: [],
    };

    const result = findShortestPath(graph, 'a', 'isolated');

    expect(result).toBeNull();
  });

  it('should prefer shorter paths over longer ones', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
        { id: 'c', type: 'hub' },
        { id: 'd', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'b', label: '' },
        { source: 'b', target: 'd', label: '' }, // Shorter path
        { source: 'a', target: 'c', label: '' },
        { source: 'c', target: 'd', label: '' }, // Also valid but same length
      ],
    };

    const result = findShortestPath(graph, 'a', 'd');

    expect(result).toBeDefined();
    expect(result!.length).toBe(3); // a -> b -> d or a -> c -> d
    expect(result![0]).toBe('a');
    expect(result![2]).toBe('d');
  });
});

describe('getSubgraph', () => {
  const largeGraph: MemoryGraph = {
    version: 1,
    nodes: [
      { id: 'a', type: 'hub' },
      { id: 'b', type: 'hub' },
      { id: 'c', type: 'hub' },
      { id: 'd', type: 'hub' },
      { id: 'e', type: 'hub' },
    ],
    edges: [
      { source: 'a', target: 'b', label: '' },
      { source: 'b', target: 'c', label: '' },
      { source: 'c', target: 'd', label: '' },
      { source: 'd', target: 'e', label: '' },
    ],
  };

  it('should extract subgraph within depth', () => {
    const result = getSubgraph(largeGraph, 'a', 2);

    expect(result.nodes.length).toBe(3); // a, b, c
    expect(result.nodes.map(n => n.id)).toContain('a');
    expect(result.nodes.map(n => n.id)).toContain('b');
    expect(result.nodes.map(n => n.id)).toContain('c');
    expect(result.nodes.map(n => n.id)).not.toContain('d');
    expect(result.nodes.map(n => n.id)).not.toContain('e');
  });

  it('should include only nodes and edges within depth', () => {
    const result = getSubgraph(largeGraph, 'a', 1);

    expect(result.nodes.length).toBe(2); // a, b
    expect(result.edges.length).toBe(1); // a -> b
    expect(result.edges[0].source).toBe('a');
    expect(result.edges[0].target).toBe('b');
  });

  it('should preserve graph version', () => {
    const result = getSubgraph(largeGraph, 'a', 2);

    expect(result.version).toBe(1);
  });
});

describe('findConnectedComponents', () => {
  it('should find single component in fully connected graph', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
        { id: 'c', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'b', label: '' },
        { source: 'b', target: 'c', label: '' },
      ],
    };

    const result = findConnectedComponents(graph);

    expect(result.length).toBe(1);
    expect(result[0]).toContain('a');
    expect(result[0]).toContain('b');
    expect(result[0]).toContain('c');
  });

  it('should find multiple components in disconnected graph', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
        { id: 'c', type: 'hub' },
        { id: 'd', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'b', label: '' },
        { source: 'c', target: 'd', label: '' },
      ],
    };

    const result = findConnectedComponents(graph);

    expect(result.length).toBe(2);

    // Check that a and b are in one component
    const component1 = result.find(c => c.includes('a'));
    expect(component1).toContain('a');
    expect(component1).toContain('b');

    // Check that c and d are in another component
    const component2 = result.find(c => c.includes('c'));
    expect(component2).toContain('c');
    expect(component2).toContain('d');
  });

  it('should treat edges as undirected', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'b', label: '' },
      ],
    };

    const result = findConnectedComponents(graph);

    expect(result.length).toBe(1);
    expect(result[0]).toContain('a');
    expect(result[0]).toContain('b');
  });

  it('should return empty array for empty graph', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [],
      edges: [],
    };

    const result = findConnectedComponents(graph);
    expect(result).toEqual([]);
  });
});

describe('calculateImpact', () => {
  it('should identify orphaned nodes', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
        { id: 'c', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'b', label: '' },
        { source: 'b', target: 'c', label: '' },
      ],
    };

    const result = calculateImpact(graph, 'b');

    expect(result.orphanedNodes).toContain('c');
    expect(result.orphanedNodes).not.toContain('a'); // a has no inbound edges to lose
  });

  it('should count broken edges', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
        { id: 'c', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'b', label: '' },
        { source: 'b', target: 'c', label: '' },
      ],
    };

    const result = calculateImpact(graph, 'b');

    expect(result.brokenEdges).toBe(2); // a->b and b->c
  });

  it('should handle node with no dependents', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'leaf', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'leaf', label: '' },
      ],
    };

    const result = calculateImpact(graph, 'leaf');

    expect(result.orphanedNodes).toEqual([]);
    expect(result.brokenEdges).toBe(1); // a->leaf
  });

  it('should not mark nodes with alternative paths as orphaned', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
        { id: 'c', type: 'hub' },
        { id: 'd', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'c', label: '' },
        { source: 'b', target: 'd', label: '' },
        { source: 'c', target: 'd', label: '' }, // d has alternative path through b
      ],
    };

    const result = calculateImpact(graph, 'c');

    // d should not be orphaned because it can still be reached through b
    expect(result.orphanedNodes).not.toContain('d');
  });
});
