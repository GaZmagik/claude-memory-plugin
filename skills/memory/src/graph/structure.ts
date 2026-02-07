/**
 * T069: Graph Data Structure
 *
 * Core graph structure for memory relationships.
 */

import * as path from 'node:path';
import { createLogger } from '../core/logger.js';
import { ensureDir, fileExists, writeFileAtomic, readFile } from '../core/fs-utils.js';

const log = createLogger('graph');

/**
 * Graph node representing a memory
 */
export interface GraphNode {
  id: string;
  type: string;
  /** Memory title (optional for backward compatibility with existing data) */
  title?: string;
  /** Memory scope (optional for backward compatibility with existing data) */
  scope?: string;
  /** Agent name for agent-scoped memories (optional) */
  agent?: string;
}

/**
 * Graph edge representing a relationship
 *
 * Cross-scope fields (sourceScope, targetScope, sourceAgent, targetAgent) are
 * optional and only present on edges that span scope boundaries. When present,
 * the edge is mirrored in both the source and target scope's graph.json files.
 *
 * Note: Keep in sync with GraphEdge in types/memory.ts (documentation layer).
 */
export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  /** Source scope identifier (e.g. 'agent-project', 'project', 'global') */
  sourceScope?: string;
  /** Target scope identifier (e.g. 'agent-project', 'project', 'global') */
  targetScope?: string;
  /** Source agent name (required when sourceScope is agent-project or agent-global) */
  sourceAgent?: string;
  /** Target agent name (required when targetScope is agent-project or agent-global) */
  targetAgent?: string;
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

  if (!(await fileExists(graphPath))) {
    return createGraph();
  }

  try {
    const content = await readFile(graphPath);
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
  await ensureDir(basePath);

  await writeFileAtomic(graphPath, JSON.stringify(graph, null, 2));
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

/**
 * Load and merge graphs from multiple base paths into a single virtual MemoryGraph.
 *
 * Deduplicates nodes by ID (first occurrence wins) and edges by source->target key.
 * Only includes edges whose source and target nodes exist in the merged node set.
 *
 * Extracted from the mermaid merge pattern (cmdMermaid) for reuse across
 * traversal, impact analysis, edge display, and other cross-scope operations.
 */
export async function loadMergedGraph(basePaths: string[]): Promise<MemoryGraph> {
  if (basePaths.length === 0) {
    return createGraph();
  }

  // Load the first graph as the base
  let merged = await loadGraph(basePaths[0]!);

  // Merge subsequent graphs
  for (let i = 1; i < basePaths.length; i++) {
    const otherGraph = await loadGraph(basePaths[i]!);

    // Deduplicate nodes by ID (first occurrence wins)
    const existingNodeIds = new Set(merged.nodes.map(n => n.id));
    const mergedNodes = [
      ...merged.nodes,
      ...otherGraph.nodes.filter(n => !existingNodeIds.has(n.id)),
    ];

    // Deduplicate edges by source->target key, and only include
    // edges whose endpoints exist in the merged node set
    const mergedNodeIds = new Set(mergedNodes.map(n => n.id));
    const existingEdgeKeys = new Set(
      merged.edges.map(e => `${e.source}->${e.target}`)
    );
    const mergedEdges = [
      ...merged.edges,
      ...otherGraph.edges.filter(e =>
        !existingEdgeKeys.has(`${e.source}->${e.target}`) &&
        mergedNodeIds.has(e.source) && mergedNodeIds.has(e.target)
      ),
    ];

    merged = { ...merged, nodes: mergedNodes, edges: mergedEdges };
  }

  return merged;
}
