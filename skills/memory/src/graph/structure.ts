/**
 * T069: Graph Data Structure
 *
 * Core graph structure for memory relationships.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createLogger } from '../core/logger.js';

const log = createLogger('graph');

/**
 * Graph node representing a memory
 */
export interface GraphNode {
  id: string;
  type: string;
}

/**
 * Graph edge representing a relationship
 */
export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

/**
 * Memory graph structure
 */
export interface MemoryGraph {
  version: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Create an empty graph
 */
export function createGraph(): MemoryGraph {
  return {
    version: 1,
    nodes: [],
    edges: [],
  };
}

/**
 * Load graph from disk
 */
export async function loadGraph(basePath: string): Promise<MemoryGraph> {
  const graphPath = path.join(basePath, 'graph.json');

  if (!fs.existsSync(graphPath)) {
    return createGraph();
  }

  try {
    const content = fs.readFileSync(graphPath, 'utf-8');
    return JSON.parse(content) as MemoryGraph;
  } catch (error) {
    log.warn('Failed to load graph, starting fresh', { path: graphPath, error: String(error) });
    return createGraph();
  }
}

/**
 * Save graph to disk
 */
export async function saveGraph(basePath: string, graph: MemoryGraph): Promise<void> {
  const graphPath = path.join(basePath, 'graph.json');

  // Ensure directory exists
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2));
  log.debug('Saved graph', { path: graphPath, nodes: graph.nodes.length, edges: graph.edges.length });
}

/**
 * Add a node to the graph (immutable)
 */
export function addNode(graph: MemoryGraph, node: GraphNode): MemoryGraph {
  const existingIndex = graph.nodes.findIndex(n => n.id === node.id);

  if (existingIndex >= 0) {
    // Update existing node
    const updatedNodes = [...graph.nodes];
    updatedNodes[existingIndex] = node;
    return { ...graph, nodes: updatedNodes };
  }

  // Add new node
  return {
    ...graph,
    nodes: [...graph.nodes, node],
  };
}

/**
 * Remove a node and its edges from the graph (immutable)
 */
export function removeNode(graph: MemoryGraph, nodeId: string): MemoryGraph {
  return {
    ...graph,
    nodes: graph.nodes.filter(n => n.id !== nodeId),
    edges: graph.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
  };
}

/**
 * Get a node by ID
 */
export function getNode(graph: MemoryGraph, nodeId: string): GraphNode | undefined {
  return graph.nodes.find(n => n.id === nodeId);
}

/**
 * Get all nodes, optionally filtered by type
 */
export function getAllNodes(graph: MemoryGraph, type?: string): GraphNode[] {
  if (type) {
    return graph.nodes.filter(n => n.type === type);
  }
  return [...graph.nodes];
}

/**
 * Check if node exists
 */
export function hasNode(graph: MemoryGraph, nodeId: string): boolean {
  return graph.nodes.some(n => n.id === nodeId);
}

/**
 * Get node count
 */
export function getNodeCount(graph: MemoryGraph): number {
  return graph.nodes.length;
}

/**
 * Get edge count
 */
export function getEdgeCount(graph: MemoryGraph): number {
  return graph.edges.length;
}
