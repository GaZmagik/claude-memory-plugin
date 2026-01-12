/**
 * Tests for T069: Graph Data Structure
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import {
  createGraph,
  loadGraph,
  saveGraph,
  addNode,
  removeNode,
  getNode,
  getAllNodes,
  hasNode,
  getNodeCount,
  getEdgeCount,
} from './structure.js';
import type { MemoryGraph, GraphNode } from './structure.js';

describe('createGraph', () => {
  it('should create empty graph with version 1', () => {
    const graph = createGraph();
    expect(graph.version).toBe(1);
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });
});

describe('loadGraph', () => {
  const testPath = '/tmp/graph-test-load';

  beforeEach(() => {
    if (existsSync(testPath)) {
      rmSync(testPath, { recursive: true });
    }
    mkdirSync(testPath, { recursive: true });
  });

  it('should load graph from disk when file exists', async () => {
    const testGraph: MemoryGraph = {
      version: 1,
      nodes: [{ id: 'test-node', type: 'learning' }],
      edges: [{ source: 'a', target: 'b', label: 'links' }],
    };
    writeFileSync(`${testPath}/graph.json`, JSON.stringify(testGraph));

    const result = await loadGraph(testPath);

    expect(result.version).toBe(1);
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(1);
  });

  it('should return empty graph when file does not exist', async () => {
    const result = await loadGraph(testPath);

    expect(result.version).toBe(1);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it('should return empty graph when JSON parsing fails', async () => {
    writeFileSync(`${testPath}/graph.json`, '{ invalid json }');

    const result = await loadGraph(testPath);

    expect(result.version).toBe(1);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});

describe('saveGraph', () => {
  const testPath = '/tmp/graph-test-save';

  beforeEach(() => {
    if (existsSync(testPath)) {
      rmSync(testPath, { recursive: true });
    }
  });

  it('should save graph to disk', async () => {
    const testGraph: MemoryGraph = {
      version: 1,
      nodes: [{ id: 'test-node', type: 'learning' }],
      edges: [],
    };

    await saveGraph(testPath, testGraph);

    expect(existsSync(`${testPath}/graph.json`)).toBe(true);
    const saved = JSON.parse(readFileSync(`${testPath}/graph.json`, 'utf-8'));
    expect(saved.nodes).toHaveLength(1);
  });

  it('should create directory if it does not exist', async () => {
    const testGraph = createGraph();

    await saveGraph(testPath, testGraph);

    expect(existsSync(testPath)).toBe(true);
    expect(existsSync(`${testPath}/graph.json`)).toBe(true);
  });

  it('should format JSON with 2-space indentation', async () => {
    const testGraph = createGraph();

    await saveGraph(testPath, testGraph);

    const content = readFileSync(`${testPath}/graph.json`, 'utf-8');
    expect(content).toContain('  '); // 2-space indent
    expect(content).toMatch(/\{\n  "version"/); // Formatted structure
  });
});

describe('addNode', () => {
  const emptyGraph: MemoryGraph = {
    version: 1,
    nodes: [],
    edges: [],
  };

  const node1: GraphNode = { id: 'node-1', type: 'decision' };
  const node2: GraphNode = { id: 'node-2', type: 'learning' };

  it('should add new node to empty graph', () => {
    const result = addNode(emptyGraph, node1);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toEqual(node1);
  });

  it('should add node to existing graph', () => {
    const graph = addNode(emptyGraph, node1);
    const result = addNode(graph, node2);
    expect(result.nodes).toHaveLength(2);
  });

  it('should update existing node with same ID', () => {
    const graph = addNode(emptyGraph, node1);
    const updatedNode: GraphNode = { id: 'node-1', type: 'artifact' };
    const result = addNode(graph, updatedNode);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].type).toBe('artifact');
  });

  it('should be immutable (not modify original graph)', () => {
    const result = addNode(emptyGraph, node1);
    expect(emptyGraph.nodes).toHaveLength(0);
    expect(result.nodes).toHaveLength(1);
  });
});

describe('removeNode', () => {
  const graph: MemoryGraph = {
    version: 1,
    nodes: [
      { id: 'node-1', type: 'decision' },
      { id: 'node-2', type: 'learning' },
    ],
    edges: [
      { source: 'node-1', target: 'node-2', label: 'leads to' },
      { source: 'node-2', target: 'node-1', label: 'relates to' },
    ],
  };

  it('should remove node by ID', () => {
    const result = removeNode(graph, 'node-1');
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('node-2');
  });

  it('should remove edges connected to the node', () => {
    const result = removeNode(graph, 'node-1');
    expect(result.edges).toHaveLength(0);
  });

  it('should be immutable', () => {
    const result = removeNode(graph, 'node-1');
    expect(graph.nodes).toHaveLength(2);
    expect(result.nodes).toHaveLength(1);
  });

  it('should handle removing non-existent node', () => {
    const result = removeNode(graph, 'non-existent');
    expect(result.nodes).toHaveLength(2);
  });
});

describe('getNode', () => {
  const graph: MemoryGraph = {
    version: 1,
    nodes: [
      { id: 'node-1', type: 'decision' },
      { id: 'node-2', type: 'learning' },
    ],
    edges: [],
  };

  it('should return node when found', () => {
    const result = getNode(graph, 'node-1');
    expect(result).toBeDefined();
    expect(result?.id).toBe('node-1');
  });

  it('should return undefined when not found', () => {
    const result = getNode(graph, 'non-existent');
    expect(result).toBeUndefined();
  });
});

describe('getAllNodes', () => {
  const graph: MemoryGraph = {
    version: 1,
    nodes: [
      { id: 'node-1', type: 'decision' },
      { id: 'node-2', type: 'learning' },
      { id: 'node-3', type: 'decision' },
    ],
    edges: [],
  };

  it('should return all nodes when no type filter', () => {
    const result = getAllNodes(graph);
    expect(result).toHaveLength(3);
  });

  it('should filter by type when specified', () => {
    const result = getAllNodes(graph, 'decision');
    expect(result).toHaveLength(2);
    expect(result.every(n => n.type === 'decision')).toBe(true);
  });

  it('should return copy of nodes array', () => {
    const result = getAllNodes(graph);
    expect(result).not.toBe(graph.nodes);
  });
});

describe('hasNode', () => {
  const graph: MemoryGraph = {
    version: 1,
    nodes: [{ id: 'node-1', type: 'decision' }],
    edges: [],
  };

  it('should return true when node exists', () => {
    expect(hasNode(graph, 'node-1')).toBe(true);
  });

  it('should return false when node does not exist', () => {
    expect(hasNode(graph, 'non-existent')).toBe(false);
  });
});

describe('getNodeCount', () => {
  it('should return 0 for empty graph', () => {
    const graph = createGraph();
    expect(getNodeCount(graph)).toBe(0);
  });

  it('should return correct count for graph with nodes', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'node-1', type: 'decision' },
        { id: 'node-2', type: 'learning' },
      ],
      edges: [],
    };
    expect(getNodeCount(graph)).toBe(2);
  });
});

describe('getEdgeCount', () => {
  it('should return 0 for empty graph', () => {
    const graph = createGraph();
    expect(getEdgeCount(graph)).toBe(0);
  });

  it('should return correct count for graph with edges', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [],
      edges: [
        { source: 'a', target: 'b', label: 'links' },
        { source: 'b', target: 'c', label: 'connects' },
      ],
    };
    expect(getEdgeCount(graph)).toBe(2);
  });
});
