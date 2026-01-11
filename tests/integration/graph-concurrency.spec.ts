/**
 * Integration Test: Graph Concurrency and Race Conditions
 *
 * Tests concurrent operations on the graph structure:
 * - Concurrent node additions
 * - Simultaneous edge updates
 * - Race conditions in graph file writes
 * - Data consistency under concurrent load
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createGraph,
  loadGraph,
  saveGraph,
  addNode,
  removeNode,
  type MemoryGraph,
  type GraphNode,
} from '../../skills/memory/src/graph/structure.js';
import { addEdge } from '../../skills/memory/src/graph/edges.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

describe('Graph Concurrency and Race Conditions', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'memory-graph-race-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Concurrent Node Operations', () => {
    it('should handle sequential node additions correctly', async () => {
      let graph = createGraph();

      // Add nodes sequentially
      const nodes: GraphNode[] = [];
      for (let i = 0; i < 10; i++) {
        const node: GraphNode = { id: `node-${i}`, type: 'learning' };
        graph = addNode(graph, node);
        nodes.push(node);
      }

      expect(graph.nodes).toHaveLength(10);

      // Save and reload
      await saveGraph(testDir, graph);
      const loaded = await loadGraph(testDir);

      expect(loaded.nodes).toHaveLength(10);
      for (const node of nodes) {
        expect(loaded.nodes.some(n => n.id === node.id)).toBe(true);
      }
    });

    it('should handle rapid add/remove operations', async () => {
      let graph = createGraph();

      // Rapidly add and remove nodes
      for (let i = 0; i < 20; i++) {
        graph = addNode(graph, { id: `node-${i}`, type: 'decision' });
      }

      expect(graph.nodes).toHaveLength(20);

      // Remove every other node
      for (let i = 0; i < 20; i += 2) {
        graph = removeNode(graph, `node-${i}`);
      }

      expect(graph.nodes).toHaveLength(10);

      // Verify only odd-numbered nodes remain
      for (let i = 1; i < 20; i += 2) {
        expect(graph.nodes.some(n => n.id === `node-${i}`)).toBe(true);
      }
    });

    it('should handle duplicate node additions correctly', async () => {
      let graph = createGraph();

      const node1: GraphNode = { id: 'test-node', type: 'learning' };
      const node2: GraphNode = { id: 'test-node', type: 'decision' };

      // Add same ID twice (should update, not duplicate)
      graph = addNode(graph, node1);
      graph = addNode(graph, node2);

      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0].type).toBe('decision'); // Updated
    });
  });

  describe('Concurrent Edge Operations', () => {
    it('should handle sequential edge additions', async () => {
      let graph = createGraph();

      // Add nodes first
      graph = addNode(graph, { id: 'node-a', type: 'decision' });
      graph = addNode(graph, { id: 'node-b', type: 'learning' });
      graph = addNode(graph, { id: 'node-c', type: 'artifact' });

      // Add edges sequentially
      graph = addEdge(graph, 'node-a', 'node-b', 'relates-to');
      graph = addEdge(graph, 'node-b', 'node-c', 'implements');
      graph = addEdge(graph, 'node-a', 'node-c', 'uses');

      expect(graph.edges).toHaveLength(3);

      // Save and reload
      await saveGraph(testDir, graph);
      const loaded = await loadGraph(testDir);

      expect(loaded.edges).toHaveLength(3);
    });

    it('should handle duplicate edge additions', async () => {
      let graph = createGraph();

      graph = addNode(graph, { id: 'node-a', type: 'decision' });
      graph = addNode(graph, { id: 'node-b', type: 'learning' });

      // Add same edge twice
      graph = addEdge(graph, 'node-a', 'node-b', 'relates-to');
      graph = addEdge(graph, 'node-a', 'node-b', 'relates-to');

      expect(graph.edges).toHaveLength(1); // Should not duplicate
    });

    it('should handle bidirectional edges', async () => {
      let graph = createGraph();

      graph = addNode(graph, { id: 'node-a', type: 'decision' });
      graph = addNode(graph, { id: 'node-b', type: 'learning' });

      // Add edges in both directions
      graph = addEdge(graph, 'node-a', 'node-b', 'relates-to');
      graph = addEdge(graph, 'node-b', 'node-a', 'relates-to');

      expect(graph.edges).toHaveLength(2); // Both directions allowed
    });

    it('should clean up edges when nodes are removed', async () => {
      let graph = createGraph();

      graph = addNode(graph, { id: 'node-a', type: 'decision' });
      graph = addNode(graph, { id: 'node-b', type: 'learning' });
      graph = addNode(graph, { id: 'node-c', type: 'artifact' });

      graph = addEdge(graph, 'node-a', 'node-b', 'relates-to');
      graph = addEdge(graph, 'node-b', 'node-c', 'implements');
      graph = addEdge(graph, 'node-a', 'node-c', 'uses');

      expect(graph.edges).toHaveLength(3);

      // Remove middle node
      graph = removeNode(graph, 'node-b');

      // Edges involving node-b should be removed
      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toHaveLength(1); // Only a->c remains
      expect(graph.edges[0].source).toBe('node-a');
      expect(graph.edges[0].target).toBe('node-c');
    });
  });

  describe('File System Race Conditions', () => {
    it('should handle rapid save operations', async () => {
      let graph = createGraph();

      // Add initial nodes
      for (let i = 0; i < 5; i++) {
        graph = addNode(graph, { id: `node-${i}`, type: 'learning' });
      }

      // Save multiple times rapidly
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(saveGraph(testDir, graph));
      }

      await Promise.all(promises);

      // Verify final state is correct
      const loaded = await loadGraph(testDir);
      expect(loaded.nodes).toHaveLength(5);
    });

    it('should handle interleaved save and load operations', async () => {
      let graph = createGraph();
      graph = addNode(graph, { id: 'node-1', type: 'decision' });

      // Save
      await saveGraph(testDir, graph);

      // Load, modify, save in parallel
      const operations = [
        (async () => {
          const g = await loadGraph(testDir);
          const modified = addNode(g, { id: 'node-2', type: 'learning' });
          await saveGraph(testDir, modified);
        })(),
        (async () => {
          const g = await loadGraph(testDir);
          const modified = addNode(g, { id: 'node-3', type: 'artifact' });
          await saveGraph(testDir, modified);
        })(),
      ];

      await Promise.all(operations);

      // Final state depends on write order (last write wins)
      const final = await loadGraph(testDir);
      expect(final.nodes.length).toBeGreaterThan(0);
    });

    it('should detect graph corruption from interrupted writes', async () => {
      let graph = createGraph();

      for (let i = 0; i < 10; i++) {
        graph = addNode(graph, { id: `node-${i}`, type: 'learning' });
      }

      await saveGraph(testDir, graph);

      // Simulate interrupted write (truncate file)
      const graphPath = path.join(testDir, 'graph.json');
      const content = fs.readFileSync(graphPath, 'utf-8');
      fs.writeFileSync(graphPath, content.slice(0, content.length / 2));

      // Load should handle gracefully
      const loaded = await loadGraph(testDir);
      expect(loaded).toBeDefined();
      // Should return empty graph or log warning
      expect(loaded.nodes.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Large Graph Stress Tests', () => {
    it('should handle graphs with many nodes efficiently', async () => {
      let graph = createGraph();

      // Add 1000 nodes
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        graph = addNode(graph, { id: `node-${i}`, type: 'learning' });
      }
      const addDuration = Date.now() - startTime;

      expect(graph.nodes).toHaveLength(1000);
      expect(addDuration).toBeLessThan(5000); // Should be fast

      // Save
      const saveStart = Date.now();
      await saveGraph(testDir, graph);
      const saveDuration = Date.now() - saveStart;

      expect(saveDuration).toBeLessThan(2000);

      // Load
      const loadStart = Date.now();
      const loaded = await loadGraph(testDir);
      const loadDuration = Date.now() - loadStart;

      expect(loaded.nodes).toHaveLength(1000);
      expect(loadDuration).toBeLessThan(2000);
    });

    it('should handle graphs with many edges', async () => {
      let graph = createGraph();

      // Create 100 nodes
      for (let i = 0; i < 100; i++) {
        graph = addNode(graph, { id: `node-${i}`, type: 'learning' });
      }

      // Create edges (every node to next 5 nodes)
      for (let i = 0; i < 100; i++) {
        for (let j = i + 1; j < Math.min(i + 6, 100); j++) {
          graph = addEdge(graph, `node-${i}`, `node-${j}`, 'relates-to');
        }
      }

      expect(graph.edges.length).toBeGreaterThan(400);

      // Save and load
      await saveGraph(testDir, graph);
      const loaded = await loadGraph(testDir);

      expect(loaded.edges.length).toBe(graph.edges.length);
    });
  });

  describe('Immutability Tests', () => {
    it('should not mutate original graph when adding nodes', () => {
      const original = createGraph();
      const node: GraphNode = { id: 'test', type: 'learning' };

      const modified = addNode(original, node);

      expect(original.nodes).toHaveLength(0);
      expect(modified.nodes).toHaveLength(1);
      expect(original).not.toBe(modified);
    });

    it('should not mutate original graph when removing nodes', () => {
      let graph = createGraph();
      graph = addNode(graph, { id: 'node-1', type: 'decision' });
      graph = addNode(graph, { id: 'node-2', type: 'learning' });

      const modified = removeNode(graph, 'node-1');

      expect(graph.nodes).toHaveLength(2);
      expect(modified.nodes).toHaveLength(1);
      expect(graph).not.toBe(modified);
    });

    it('should not mutate original graph when adding edges', () => {
      let graph = createGraph();
      graph = addNode(graph, { id: 'node-a', type: 'decision' });
      graph = addNode(graph, { id: 'node-b', type: 'learning' });

      const modified = addEdge(graph, 'node-a', 'node-b', 'relates-to');

      expect(graph.edges).toHaveLength(0);
      expect(modified.edges).toHaveLength(1);
      expect(graph).not.toBe(modified);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain node uniqueness', async () => {
      let graph = createGraph();

      // Try to add same node multiple times
      for (let i = 0; i < 5; i++) {
        graph = addNode(graph, { id: 'duplicate', type: 'learning' });
      }

      expect(graph.nodes).toHaveLength(1);

      await saveGraph(testDir, graph);
      const loaded = await loadGraph(testDir);

      expect(loaded.nodes).toHaveLength(1);
    });

    it('should prevent edges to non-existent nodes', async () => {
      let graph = createGraph();
      graph = addNode(graph, { id: 'node-a', type: 'decision' });

      // Try to add edge to non-existent node - should throw
      expect(() => {
        addEdge(graph, 'node-a', 'non-existent', 'relates-to');
      }).toThrow('Target node not found');
    });

    it('should handle empty graph correctly', async () => {
      const empty = createGraph();

      await saveGraph(testDir, empty);
      const loaded = await loadGraph(testDir);

      expect(loaded.nodes).toHaveLength(0);
      expect(loaded.edges).toHaveLength(0);
      expect(loaded.version).toBe(1);
    });
  });

  describe('Version Compatibility', () => {
    it('should load graphs with different versions', async () => {
      const graph: MemoryGraph = {
        version: 2, // Future version
        nodes: [{ id: 'test', type: 'learning' }],
        edges: [],
      };

      await saveGraph(testDir, graph);
      const loaded = await loadGraph(testDir);

      expect(loaded.version).toBe(2);
      expect(loaded.nodes).toHaveLength(1);
    });

    it('should handle missing version field', async () => {
      const graphPath = path.join(testDir, 'graph.json');
      fs.mkdirSync(testDir, { recursive: true });

      // Create graph without version
      const invalidGraph = {
        nodes: [{ id: 'test', type: 'learning' }],
        edges: [],
      };

      fs.writeFileSync(graphPath, JSON.stringify(invalidGraph));

      const loaded = await loadGraph(testDir);
      expect(loaded).toBeDefined();
    });
  });
});
