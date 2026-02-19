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
 * Optional cross-scope metadata for edges spanning scope boundaries
 */
export interface EdgeMetadata {
  sourceScope?: string;
  targetScope?: string;
  sourceAgent?: string;
  targetAgent?: string;
  /** Cosine similarity score [0–1]. NaN is rejected; out-of-range values are clamped. */
  similarity?: number;
  /** LLM-verified relation label staging area (written by --llm-type or --verify). */
  verifiedRelation?: string;
}

/**
 * Add an edge between two nodes (immutable)
 *
 * @param metadata - Optional cross-scope metadata. When provided, fields are
 *                   included in the edge object for cross-scope identification.
 *
 * Similarity validation note: addEdge() clamps out-of-range values to [0, 1]
 * (Infinity → 1.0, -0.1 → 0.0) and rejects NaN. This is intentionally more
 * permissive than updateEdgeMetadata(), which strictly rejects out-of-range
 * values. The difference reflects context: auto-link pipelines may produce
 * slightly over/under-range floats due to floating-point arithmetic, whereas
 * explicit user input via --similarity should be validated precisely at the
 * call site.
 */
export function addEdge(
  graph: MemoryGraph,
  source: string,
  target: string,
  label: string = 'relates-to',
  metadata?: EdgeMetadata
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

  const edge: GraphEdge = { source, target, label };

  // Spread cross-scope metadata if provided (only defined values)
  if (metadata) {
    if (metadata.sourceScope) edge.sourceScope = metadata.sourceScope;
    if (metadata.targetScope) edge.targetScope = metadata.targetScope;
    if (metadata.sourceAgent) edge.sourceAgent = metadata.sourceAgent;
    if (metadata.targetAgent) edge.targetAgent = metadata.targetAgent;
    if (metadata.similarity !== undefined) {
      const s = metadata.similarity;
      if (isNaN(s)) {
        throw new Error(`similarity must be a finite number, received NaN`);
      }
      edge.similarity = Math.min(1, Math.max(0, s));
    }
    if (metadata.verifiedRelation !== undefined) {
      edge.verifiedRelation = metadata.verifiedRelation;
    }
  }

  return {
    ...graph,
    edges: [...graph.edges, edge],
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
 * Check if an edge spans scope boundaries
 *
 * Returns true only when both sourceScope and targetScope are present,
 * indicating this edge connects memories in different scopes.
 */
export function isCrossScopeEdge(edge: GraphEdge): boolean {
  return Boolean(edge.sourceScope) && Boolean(edge.targetScope);
}

/**
 * Validate cross-scope edge metadata
 *
 * Rules:
 * - sourceScope and targetScope must both be present or both absent
 * - Agent scopes (agent-project, agent-global) require the corresponding agent name
 * - Non-cross-scope edges (no scope fields) are always valid
 */
export function validateCrossScopeEdge(edge: GraphEdge): { valid: boolean; error?: string } {
  const hasSource = Boolean(edge.sourceScope);
  const hasTarget = Boolean(edge.targetScope);

  // No scope fields = regular edge, always valid
  if (!hasSource && !hasTarget) {
    return { valid: true };
  }

  // Must have both or neither
  if (hasSource && !hasTarget) {
    return { valid: false, error: 'Cross-scope edge requires targetScope when sourceScope is set' };
  }
  if (!hasSource && hasTarget) {
    return { valid: false, error: 'Cross-scope edge requires sourceScope when targetScope is set' };
  }

  // Agent scopes require agent names
  const agentScopes = ['agent-project', 'agent-global'];

  if (agentScopes.includes(edge.sourceScope!) && !edge.sourceAgent) {
    return { valid: false, error: `Agent scope '${edge.sourceScope}' requires sourceAgent to be set` };
  }

  if (agentScopes.includes(edge.targetScope!) && !edge.targetAgent) {
    return { valid: false, error: `Agent scope '${edge.targetScope}' requires targetAgent to be set` };
  }

  return { valid: true };
}

/**
 * Update edge metadata (immutable)
 *
 * Updates similarity, verifiedRelation, or other metadata fields on an existing edge.
 * Throws if the edge doesn't exist.
 *
 * @param metadata - New metadata to merge into the edge. Undefined fields are left unchanged.
 */
export function updateEdge(
  graph: MemoryGraph,
  source: string,
  target: string,
  label: string,
  metadata: EdgeMetadata
): MemoryGraph {
  // Find the edge
  const edgeIndex = graph.edges.findIndex(
    e => e.source === source && e.target === target && e.label === label
  );

  if (edgeIndex === -1) {
    throw new Error(`Edge not found: ${source} -> ${target} (${label})`);
  }

  const existingEdge = graph.edges[edgeIndex]!;

  // Validate and prepare new metadata
  let newSimilarity = existingEdge.similarity;
  let newVerifiedRelation = existingEdge.verifiedRelation;

  if (metadata.similarity !== undefined) {
    const s = metadata.similarity;
    if (isNaN(s) || s < 0 || s > 1) {
      throw new Error(`similarity must be in range [0, 1], received ${s}`);
    }
    newSimilarity = s;
  }

  if (metadata.verifiedRelation !== undefined) {
    newVerifiedRelation = metadata.verifiedRelation;
  }

  // Create updated edge
  const updatedEdge: GraphEdge = {
    source: existingEdge.source,
    target: existingEdge.target,
    label: existingEdge.label,
    ...(existingEdge.sourceScope && { sourceScope: existingEdge.sourceScope }),
    ...(existingEdge.targetScope && { targetScope: existingEdge.targetScope }),
    ...(existingEdge.sourceAgent && { sourceAgent: existingEdge.sourceAgent }),
    ...(existingEdge.targetAgent && { targetAgent: existingEdge.targetAgent }),
    ...(newSimilarity !== undefined && { similarity: newSimilarity }),
    ...(newVerifiedRelation !== undefined && { verifiedRelation: newVerifiedRelation }),
  };

  // Replace edge in array
  const newEdges = [...graph.edges];
  newEdges[edgeIndex] = updatedEdge;

  return {
    ...graph,
    edges: newEdges,
  };
}

/**
 * Get an edge by source, target, and label
 */
export function getEdge(
  graph: MemoryGraph,
  source: string,
  target: string,
  label: string
): GraphEdge | undefined {
  return graph.edges.find(
    e => e.source === source && e.target === target && e.label === label
  );
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
