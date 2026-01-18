/**
 * T071: Graph Traversal
 *
 * BFS/DFS traversal and path finding for memory graphs.
 */

import type { MemoryGraph } from './structure.js';
import { getOutboundEdges, getInboundEdges } from './edges.js';

/**
 * Adjacency list for bidirectional graph traversal
 */
export interface AdjacencyList {
  /** Map from node ID to set of connected node IDs (undirected) */
  neighbours: Map<string, Set<string>>;
  /** Map from node ID to set of outbound target IDs */
  outbound: Map<string, Set<string>>;
  /** Map from node ID to set of inbound source IDs */
  inbound: Map<string, Set<string>>;
}

/**
 * Build adjacency list from graph edges (O(e) where e = edge count)
 *
 * Use this for repeated lookups to avoid O(e) scans per lookup.
 */
export function buildAdjacencyList(graph: MemoryGraph): AdjacencyList {
  const neighbours = new Map<string, Set<string>>();
  const outbound = new Map<string, Set<string>>();
  const inbound = new Map<string, Set<string>>();

  // Initialise empty sets for all nodes
  for (const node of graph.nodes) {
    neighbours.set(node.id, new Set());
    outbound.set(node.id, new Set());
    inbound.set(node.id, new Set());
  }

  // Populate from edges (single pass - O(e))
  for (const edge of graph.edges) {
    // Undirected neighbours (both directions)
    neighbours.get(edge.source)?.add(edge.target);
    neighbours.get(edge.target)?.add(edge.source);

    // Directed edges
    outbound.get(edge.source)?.add(edge.target);
    inbound.get(edge.target)?.add(edge.source);
  }

  return { neighbours, outbound, inbound };
}

/**
 * Traversal result
 */
export interface TraversalResult {
  /** Visited node IDs in order */
  visited: string[];
  /** Depth of each node from start */
  depths: Map<string, number>;
}

/**
 * Breadth-first traversal from a starting node
 */
export function bfsTraversal(
  graph: MemoryGraph,
  startNodeId: string,
  maxDepth: number = Infinity
): TraversalResult {
  const visited: string[] = [];
  const depths = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = [{ id: startNodeId, depth: 0 }];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;

    if (seen.has(id) || depth > maxDepth) {
      continue;
    }

    seen.add(id);
    visited.push(id);
    depths.set(id, depth);

    // Get outbound edges
    const edges = getOutboundEdges(graph, id);
    for (const edge of edges) {
      if (!seen.has(edge.target)) {
        queue.push({ id: edge.target, depth: depth + 1 });
      }
    }
  }

  return { visited, depths };
}

/**
 * Depth-first traversal from a starting node
 */
export function dfsTraversal(
  graph: MemoryGraph,
  startNodeId: string,
  maxDepth: number = Infinity
): TraversalResult {
  const visited: string[] = [];
  const depths = new Map<string, number>();
  const seen = new Set<string>();

  function visit(id: string, depth: number): void {
    if (seen.has(id) || depth > maxDepth) {
      return;
    }

    seen.add(id);
    visited.push(id);
    depths.set(id, depth);

    const edges = getOutboundEdges(graph, id);
    for (const edge of edges) {
      visit(edge.target, depth + 1);
    }
  }

  visit(startNodeId, 0);

  return { visited, depths };
}

/**
 * Find all nodes reachable from a starting node
 */
export function findReachable(graph: MemoryGraph, startNodeId: string): string[] {
  return bfsTraversal(graph, startNodeId).visited;
}

/**
 * Find all nodes that can reach a target node (reverse traversal)
 */
export function findPredecessors(graph: MemoryGraph, targetNodeId: string): string[] {
  const visited: string[] = [];
  const queue: string[] = [targetNodeId];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift()!;

    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    visited.push(id);

    // Get inbound edges (reverse direction)
    const edges = getInboundEdges(graph, id);
    for (const edge of edges) {
      if (!seen.has(edge.source)) {
        queue.push(edge.source);
      }
    }
  }

  return visited;
}

/**
 * Find shortest path between two nodes
 */
export function findShortestPath(
  graph: MemoryGraph,
  sourceId: string,
  targetId: string
): string[] | null {
  if (sourceId === targetId) {
    return [sourceId];
  }

  const queue: Array<{ id: string; path: string[] }> = [{ id: sourceId, path: [sourceId] }];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;

    if (seen.has(id)) {
      continue;
    }
    seen.add(id);

    const edges = getOutboundEdges(graph, id);
    for (const edge of edges) {
      const newPath = [...path, edge.target];

      if (edge.target === targetId) {
        return newPath;
      }

      if (!seen.has(edge.target)) {
        queue.push({ id: edge.target, path: newPath });
      }
    }
  }

  return null; // No path found
}

/**
 * Get subgraph containing nodes within depth from start
 */
export function getSubgraph(
  graph: MemoryGraph,
  startNodeId: string,
  maxDepth: number
): MemoryGraph {
  const { visited } = bfsTraversal(graph, startNodeId, maxDepth);
  const nodeSet = new Set(visited);

  return {
    version: graph.version,
    nodes: graph.nodes.filter(n => nodeSet.has(n.id)),
    edges: graph.edges.filter(e => nodeSet.has(e.source) && nodeSet.has(e.target)),
  };
}

/**
 * Find connected components in the graph
 *
 * Uses adjacency list for O(n + e) complexity instead of O(n * e).
 */
export function findConnectedComponents(graph: MemoryGraph): string[][] {
  // Build adjacency list once - O(n + e)
  const adjacency = buildAdjacencyList(graph);
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const node of graph.nodes) {
    if (visited.has(node.id)) {
      continue;
    }

    // BFS to find all connected nodes (treating edges as undirected)
    const component: string[] = [];
    const queue: string[] = [node.id];
    let queueIndex = 0; // Use index instead of shift() for O(1) dequeue

    while (queueIndex < queue.length) {
      const id = queue[queueIndex++]!;

      if (visited.has(id)) {
        continue;
      }

      visited.add(id);
      component.push(id);

      // Get all connected nodes using O(1) adjacency lookup
      const neighbours = adjacency.neighbours.get(id);
      if (neighbours) {
        for (const neighbourId of neighbours) {
          if (!visited.has(neighbourId)) {
            queue.push(neighbourId);
          }
        }
      }
    }

    if (component.length > 0) {
      components.push(component);
    }
  }

  return components;
}

/**
 * Calculate impact of removing a node (what would be orphaned)
 */
export function calculateImpact(graph: MemoryGraph, nodeId: string): {
  orphanedNodes: string[];
  brokenEdges: number;
} {
  // Find nodes that would be orphaned (only reachable through this node)
  // Use BFS to find all nodes reachable FROM this node (dependents)
  const dependents = findReachable(graph, nodeId);
  const orphanedNodes: string[] = [];

  for (const depId of dependents) {
    if (depId === nodeId) continue;

    // Check if this node has any other inbound edge NOT from the removed node
    const inbound = getInboundEdges(graph, depId);
    const hasOtherPath = inbound.some(e => e.source !== nodeId);

    if (!hasOtherPath && inbound.length > 0) {
      orphanedNodes.push(depId);
    }
  }

  // Count edges that would be broken
  const brokenEdges = graph.edges.filter(
    e => e.source === nodeId || e.target === nodeId
  ).length;

  return { orphanedNodes, brokenEdges };
}
