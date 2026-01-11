/**
 * T071: Graph Traversal
 *
 * BFS/DFS traversal and path finding for memory graphs.
 */

import type { MemoryGraph } from './structure.js';
import { getOutboundEdges, getInboundEdges } from './edges.js';

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
 */
export function findConnectedComponents(graph: MemoryGraph): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const node of graph.nodes) {
    if (visited.has(node.id)) {
      continue;
    }

    // BFS to find all connected nodes (treating edges as undirected)
    const component: string[] = [];
    const queue: string[] = [node.id];

    while (queue.length > 0) {
      const id = queue.shift()!;

      if (visited.has(id)) {
        continue;
      }

      visited.add(id);
      component.push(id);

      // Get all connected nodes (both directions)
      for (const edge of graph.edges) {
        if (edge.source === id && !visited.has(edge.target)) {
          queue.push(edge.target);
        }
        if (edge.target === id && !visited.has(edge.source)) {
          queue.push(edge.source);
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
  const dependents = findPredecessors(graph, nodeId);
  const orphanedNodes: string[] = [];

  for (const depId of dependents) {
    if (depId === nodeId) continue;

    // Check if this node has any other path to a "root" node
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
