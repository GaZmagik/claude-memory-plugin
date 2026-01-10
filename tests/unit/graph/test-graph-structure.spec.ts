/**
 * T065: Unit tests for graph data structure
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  createGraph,
  loadGraph,
  saveGraph,
  addNode,
  removeNode,
  getNode,
  getAllNodes,
  type MemoryGraph,
  type GraphNode,
} from '../../../skills/memory/src/graph/structure.js';

describe('Graph Data Structure', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('createGraph', () => {
    it('should create empty graph with correct structure', () => {
      const graph = createGraph();

      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });

    it('should include version number', () => {
      const graph = createGraph();

      expect(graph).toHaveProperty('version');
      expect(graph.version).toBe(1);
    });
  });

  describe('loadGraph', () => {
    it('should load existing graph from file', async () => {
      const existingGraph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'node-1', type: 'decision' }],
        edges: [],
      };
      fs.writeFileSync(
        path.join(testDir, 'graph.json'),
        JSON.stringify(existingGraph)
      );

      const graph = await loadGraph(testDir);

      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0].id).toBe('node-1');
    });

    it('should return empty graph if file does not exist', async () => {
      const graph = await loadGraph(testDir);

      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });

    it('should handle corrupted graph file gracefully', async () => {
      fs.writeFileSync(path.join(testDir, 'graph.json'), 'invalid json{');

      const graph = await loadGraph(testDir);

      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });
  });

  describe('saveGraph', () => {
    it('should save graph to file', async () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'test-node', type: 'learning' }],
        edges: [],
      };

      await saveGraph(testDir, graph);

      const saved = JSON.parse(
        fs.readFileSync(path.join(testDir, 'graph.json'), 'utf-8')
      );
      expect(saved.nodes[0].id).toBe('test-node');
    });

    it('should create directory if it does not exist', async () => {
      const nestedDir = path.join(testDir, 'nested', 'dir');
      const graph = createGraph();

      await saveGraph(nestedDir, graph);

      expect(fs.existsSync(path.join(nestedDir, 'graph.json'))).toBe(true);
    });

    it('should preserve graph version', async () => {
      const graph: MemoryGraph = {
        version: 2,
        nodes: [],
        edges: [],
      };

      await saveGraph(testDir, graph);

      const saved = JSON.parse(
        fs.readFileSync(path.join(testDir, 'graph.json'), 'utf-8')
      );
      expect(saved.version).toBe(2);
    });
  });

  describe('addNode', () => {
    it('should add node to graph', () => {
      const graph = createGraph();
      const node: GraphNode = { id: 'new-node', type: 'decision' };

      const updated = addNode(graph, node);

      expect(updated.nodes).toHaveLength(1);
      expect(updated.nodes[0].id).toBe('new-node');
    });

    it('should not duplicate existing node', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'existing', type: 'decision' }],
        edges: [],
      };

      const updated = addNode(graph, { id: 'existing', type: 'decision' });

      expect(updated.nodes).toHaveLength(1);
    });

    it('should update existing node with new data', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'node-1', type: 'decision' }],
        edges: [],
      };

      const updated = addNode(graph, { id: 'node-1', type: 'learning' });

      expect(updated.nodes[0].type).toBe('learning');
    });

    it('should return new graph object (immutable)', () => {
      const graph = createGraph();
      const node: GraphNode = { id: 'new', type: 'artifact' };

      const updated = addNode(graph, node);

      expect(updated).not.toBe(graph);
      expect(graph.nodes).toHaveLength(0);
    });
  });

  describe('removeNode', () => {
    it('should remove node from graph', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'learning' },
        ],
        edges: [],
      };

      const updated = removeNode(graph, 'node-1');

      expect(updated.nodes).toHaveLength(1);
      expect(updated.nodes[0].id).toBe('node-2');
    });

    it('should remove associated edges when removing node', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'learning' },
        ],
        edges: [
          { source: 'node-1', target: 'node-2', label: 'relates-to' },
          { source: 'node-2', target: 'node-1', label: 'informed-by' },
        ],
      };

      const updated = removeNode(graph, 'node-1');

      expect(updated.edges).toHaveLength(0);
    });

    it('should handle non-existent node gracefully', () => {
      const graph = createGraph();

      const updated = removeNode(graph, 'non-existent');

      expect(updated.nodes).toEqual([]);
    });
  });

  describe('getNode', () => {
    it('should return node by ID', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'target', type: 'artifact' }],
        edges: [],
      };

      const node = getNode(graph, 'target');

      expect(node).toBeDefined();
      expect(node?.id).toBe('target');
    });

    it('should return undefined for non-existent node', () => {
      const graph = createGraph();

      const node = getNode(graph, 'missing');

      expect(node).toBeUndefined();
    });
  });

  describe('getAllNodes', () => {
    it('should return all nodes', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'learning' },
        ],
        edges: [],
      };

      const nodes = getAllNodes(graph);

      expect(nodes).toHaveLength(2);
    });

    it('should return empty array for empty graph', () => {
      const graph = createGraph();

      const nodes = getAllNodes(graph);

      expect(nodes).toEqual([]);
    });

    it('should filter nodes by type', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'learning' },
          { id: 'node-3', type: 'decision' },
        ],
        edges: [],
      };

      const decisions = getAllNodes(graph, 'decision');

      expect(decisions).toHaveLength(2);
      expect(decisions.every(n => n.type === 'decision')).toBe(true);
    });
  });
});
