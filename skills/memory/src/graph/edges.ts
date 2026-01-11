/**
 * T070: Graph Edge Operations
 *
 * Link and unlink operations for memory relationships.
 */

import type { MemoryGraph, GraphEdge } from './structure.js';
import { hasNode } from './structure.js';

export type { MemoryGraph };

/**
 * Edge labels for relationship types
 */
export const EDGE_LABELS = [
  'relates-to',
  'informed-by',
  'implements',
  'supersedes',
  'warns',
  'documents',
  'extends',
  'depends-on',
  'contradicts',
  'auto-linked-by-similarity',
] as const;

export type EdgeLabel = (typeof EDGE_LABELS)[number] | string;

export type { GraphEdge };

/**
 * Add an edge between two nodes (immutable)
 */
export function addEdge(
  graph: MemoryGraph,
  source: string,
  target: string,
  label: string = 'relates-to'
): MemoryGraph {
  // Validate nodes exist
  if (!hasNode(graph, source)) {
    throw new Error(`Source node not found: ${source}`);
  }
  if (!hasNode(graph, target)) {
    throw new Error(`Target node not found: ${target}`);
  }

  // Prevent self-referencing
  if (source === target) {
    throw new Error('Cannot create self-referencing edge');
  }

  // Check for duplicate
  const exists = graph.edges.some(
    e => e.source === source && e.target === target && e.label === label
  );
  if (exists) {
    return graph;
  }

  return {
    ...graph,
    edges: [...graph.edges, { source, target, label }],
  };
}

/**
 * Remove an edge between two nodes (immutable)
 */
export function removeEdge(
  graph: MemoryGraph,
  source: string,
  target: string,
  label?: string
): MemoryGraph {
  return {
    ...graph,
    edges: graph.edges.filter(e => {
      if (e.source !== source || e.target !== target) {
        return true;
      }
      if (label && e.label !== label) {
        return true;
      }
      return false;
    }),
  };
}

/**
 * Get all edges
 */
export function getEdges(graph: MemoryGraph): GraphEdge[] {
  return [...graph.edges];
}

/**
 * Get inbound edges (pointing to node)
 */
export function getInboundEdges(graph: MemoryGraph, nodeId: string): GraphEdge[] {
  return graph.edges.filter(e => e.target === nodeId);
}

/**
 * Get outbound edges (originating from node)
 */
export function getOutboundEdges(graph: MemoryGraph, nodeId: string): GraphEdge[] {
  return graph.edges.filter(e => e.source === nodeId);
}

/**
 * Get all edges for a node (inbound and outbound)
 */
export function getAllEdgesForNode(graph: MemoryGraph, nodeId: string): GraphEdge[] {
  return graph.edges.filter(e => e.source === nodeId || e.target === nodeId);
}

/**
 * Check if edge exists
 */
export function hasEdge(
  graph: MemoryGraph,
  source: string,
  target: string,
  label?: string
): boolean {
  return graph.edges.some(e => {
    if (e.source !== source || e.target !== target) {
      return false;
    }
    if (label && e.label !== label) {
      return false;
    }
    return true;
  });
}

/**
 * Get neighbours of a node
 */
export function getNeighbours(graph: MemoryGraph, nodeId: string): string[] {
  const neighbours = new Set<string>();

  for (const edge of graph.edges) {
    if (edge.source === nodeId) {
      neighbours.add(edge.target);
    }
    if (edge.target === nodeId) {
      neighbours.add(edge.source);
    }
  }

  return Array.from(neighbours);
}

/**
 * Get node degree (number of connections)
 */
export function getNodeDegree(graph: MemoryGraph, nodeId: string): number {
  return getAllEdgesForNode(graph, nodeId).length;
}

/**
 * Find orphaned nodes (nodes with no edges)
 */
export function findOrphanedNodes(graph: MemoryGraph): string[] {
  const connectedNodes = new Set<string>();

  for (const edge of graph.edges) {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  }

  return graph.nodes
    .filter(n => !connectedNodes.has(n.id))
    .map(n => n.id);
}

/**
 * Bulk add edges (immutable)
 */
export function bulkAddEdges(
  graph: MemoryGraph,
  edges: Array<{ source: string; target: string; label?: string }>
): MemoryGraph {
  let result = graph;

  for (const edge of edges) {
    try {
      result = addEdge(result, edge.source, edge.target, edge.label);
    } catch {
      // Skip invalid edges
    }
  }

  return result;
}
