/**
 * Link Update Operations
 *
 * Provides updateEdgeMetadata() for mutating metadata fields on existing edges
 * without creating or removing them. Supports same-scope and cross-scope edges.
 */

import { loadGraph, saveGraph } from './structure.js';
import type { GraphEdge } from './structure.js';
import { generate, isAvailable } from '../services/ollama.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Request to mutate metadata on an existing edge.
 *
 * Constraints:
 * - verify and apply are mutually exclusive.
 * - similarity: strict validation — NaN, Infinity, and out-of-range [0,1] are rejected.
 */
export interface UpdateEdgeRequest {
  /** Source memory ID */
  sourceId: string;
  /** Target memory ID */
  targetId: string;
  /** Primary scope base path for graph scan */
  basePath: string;
  /** Additional scope base paths for cross-scope edge scan */
  crossScopeBasePaths?: string[];
  /** New cosine similarity value [0–1]. NaN/Infinity/out-of-range rejected. */
  similarity?: number;
  /** New relation label to write onto edge.label */
  relation?: string;
  /** When true, invoke LLM and store result as verifiedRelation (Phase D wires the LLM call) */
  verify?: boolean;
  /** When true, promote verifiedRelation to label and remove verifiedRelation entirely */
  apply?: boolean;
}

/**
 * Response from updateEdgeMetadata
 */
export interface UpdateEdgeResponse {
  status: 'success' | 'error';
  error?: string;
  /** The updated edge state on success */
  edge?: GraphEdge;
  /** True when --apply promoted a verifiedRelation */
  applied?: boolean;
  /** True when --apply found no verifiedRelation to promote (no-op) */
  noOp?: boolean;
}

// ============================================================================
// Validation
// ============================================================================

function validateSimilarity(value: number): string | null {
  if (isNaN(value)) return 'similarity must be a finite number, received NaN';
  if (!isFinite(value)) return `similarity must be a finite number, received ${value}`;
  if (value < 0 || value > 1) return `similarity must be in range [0, 1], received ${value}`;
  return null;
}

// ============================================================================
// Core
// ============================================================================

/**
 * Update metadata fields on an existing edge in place.
 *
 * Scans basePath and all crossScopeBasePaths for a matching (sourceId, targetId) edge.
 * For cross-scope edges, updates the edge in every graph file where it appears.
 */
export async function updateEdgeMetadata(
  request: UpdateEdgeRequest
): Promise<UpdateEdgeResponse> {
  const { sourceId, targetId, basePath, crossScopeBasePaths = [] } = request;

  // Mutual exclusion guard — before any I/O
  if (request.verify && request.apply) {
    return {
      status: 'error',
      error: '--verify and --apply are mutually exclusive in a single call',
    };
  }

  // Validate similarity before any I/O
  if (request.similarity !== undefined) {
    const err = validateSimilarity(request.similarity);
    if (err) {
      return { status: 'error', error: err };
    }
  }

  const allPaths = [basePath, ...crossScopeBasePaths];

  try {
    const graphs = await Promise.all(allPaths.map(p => loadGraph(p)));

    // Find the edge in any scanned graph
    let foundEdge: GraphEdge | undefined;
    for (const graph of graphs) {
      const match = graph.edges.find(
        e => e.source === sourceId && e.target === targetId
      );
      if (match) {
        foundEdge = match;
        break;
      }
    }

    if (!foundEdge) {
      return {
        status: 'error',
        error: `Edge not found: source '${sourceId}' not found in any scanned graph`,
      };
    }

    // --apply: promote verifiedRelation to label and delete the staging field
    if (request.apply) {
      if (!foundEdge.verifiedRelation) {
        return { status: 'success', noOp: true };
      }

      let saved = false;
      for (let i = 0; i < allPaths.length; i++) {
        const graph = graphs[i]!;
        const edgeInGraph = graph.edges.find(
          e => e.source === sourceId && e.target === targetId
        );
        if (edgeInGraph?.verifiedRelation) {
          edgeInGraph.label = edgeInGraph.verifiedRelation;
          delete edgeInGraph.verifiedRelation;
          await saveGraph(allPaths[i]!, graph);
          saved = true;
          foundEdge = edgeInGraph;
        }
      }

      return { status: 'success', applied: saved || undefined, edge: foundEdge };
    }

    // Mutation path: similarity / relation / verify scaffold
    for (let i = 0; i < allPaths.length; i++) {
      const graph = graphs[i]!;
      const edgeInGraph = graph.edges.find(
        e => e.source === sourceId && e.target === targetId
      );
      if (!edgeInGraph) continue;

      let dirty = false;

      if (request.similarity !== undefined) {
        edgeInGraph.similarity = request.similarity;
        dirty = true;
      }
      if (request.relation !== undefined) {
        edgeInGraph.label = request.relation;
        dirty = true;
      }
      if (request.verify) {
        const available = await isAvailable();
        if (available) {
          const prompt = `Given the relation label "${edgeInGraph.label}" between memories "${sourceId}" and "${targetId}", suggest a more precise relation label. Reply with a single short label only.`;
          const llmResult = await generate(prompt, undefined, 60_000);
          const trimmed = llmResult.trim();
          if (trimmed) {
            edgeInGraph.verifiedRelation = trimmed;
            dirty = true;
          }
        } else {
          process.stderr.write('[Ollama] Unavailable — skipping --verify\n');
        }
      }

      if (dirty) {
        await saveGraph(allPaths[i]!, graph);
        foundEdge = edgeInGraph;
      }
    }

    return { status: 'success', edge: foundEdge };
  } catch (err) {
    return {
      status: 'error',
      error: `Failed to update edge: ${String(err)}`,
    };
  }
}
