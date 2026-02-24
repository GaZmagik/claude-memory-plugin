/**
 * Batch Edge Scoring
 *
 * Computes cosine similarity for all edges with available embeddings,
 * with optional LLM relation-label suggestion and promotion.
 */

import * as path from 'node:path';
import { loadEmbeddingCache } from '../search/embedding.js';
import { cosineSimilarity } from '../search/similarity.js';
import { loadGraph, saveGraph, GraphNode } from './structure.js';
import { getEdges } from './edges.js';
import { generate, isAvailable } from '../services/ollama.js';
import { validateLlmLabel, sanitiseTitleForPrompt } from '../suggest/suggest-links.js';

// ============================================================================
// Types
// ============================================================================

export interface ScoreEdgesRequest {
  basePath: string;
  /** Preview what would change without writing */
  dryRun?: boolean;
  /** LLM-suggest relation label → verifiedRelation staging field */
  verify?: boolean;
  /** Promote verifiedRelation → label on scored edges */
  apply?: boolean;
  /** Re-score edges that already have similarity */
  force?: boolean;
}

export interface ScoreEdgesResponse {
  status: 'success' | 'error';
  error?: string;
  /** Edges where similarity was computed */
  scored: number;
  /** Edges skipped because similarity already set and --force not used */
  skipped: number;
  /** Edges skipped because source or target had no embedding */
  noEmbedding: number;
  /** Edges where Ollama suggested a verifiedRelation label */
  verified: number;
  /** Edges where verifiedRelation was promoted to label */
  applied: number;
}

// ============================================================================
// Core
// ============================================================================

/**
 * Batch-score all graph edges that have embeddings available.
 *
 * Uses direct mutable edge mutation (matching link-update.ts pattern) so that
 * verifiedRelation can be deleted during --apply without requiring the caller
 * to rebuild the full edge object.
 *
 * saveGraph is called once after all mutations — not per-edge.
 */
export async function scoreEdges(request: ScoreEdgesRequest): Promise<ScoreEdgesResponse> {
  const { basePath, dryRun = false, verify = false, apply = false, force = false } = request;

  // basePath validation is enforced at the CLI layer via getResolvedScopePath().
  // Direct callers are responsible for supplying a valid memory directory path.

  try {
    const cachePath = path.join(basePath, 'embeddings.json');
    const [cache, graph] = await Promise.all([
      loadEmbeddingCache(cachePath),
      loadGraph(basePath),
    ]);

    // getEdges returns shallow copy of array — edge objects are same references as graph.edges
    const edges = getEdges(graph);

    // Build node lookup map once for O(1) access per edge (avoids O(E×N) find() calls)
    const nodeMap = new Map<string, GraphNode>(graph.nodes.map(n => [n.id, n]));

    // Check Ollama availability once before the loop — not per-edge
    const ollamaReady = (verify && !dryRun) ? await isAvailable() : false;

    let scored = 0;
    let skipped = 0;
    let noEmbedding = 0;
    let verified = 0;
    let applied = 0;

    for (const edge of edges) {
      const sourceEntry = cache.memories[edge.source];
      const targetEntry = cache.memories[edge.target];

      if (!sourceEntry?.embedding || !targetEntry?.embedding) {
        noEmbedding++;
        continue;
      }

      if (edge.similarity !== undefined && !force) {
        skipped++;
      } else {
        const similarity = cosineSimilarity(sourceEntry.embedding, targetEntry.embedding);
        scored++;

        if (!dryRun) {
          // Mutate the edge in-place (edge IS the same object as graph.edges[i])
          edge.similarity = similarity;

          // --verify: ask Ollama for a relation label and stage it
          if (verify && ollamaReady) {
            const sourceNode = nodeMap.get(edge.source);
            const targetNode = nodeMap.get(edge.target);
            const sourceLabel = sanitiseTitleForPrompt(sourceNode?.title ?? edge.source);
            const targetLabel = sanitiseTitleForPrompt(targetNode?.title ?? edge.target);
            const prompt = `Given source memory [${sourceLabel}] and target memory [${targetLabel}], what is the best relation label for their link? Reply with a single short label only, using lowercase letters, digits, and hyphens.`;
            const llmResult = await generate(prompt, undefined, 60_000);
            const candidate = validateLlmLabel(llmResult);
            if (candidate) {
              edge.verifiedRelation = candidate;
              verified++;
            }
          }
        }
      }

      // --apply: runs on all edges with embeddings, not just those scored in this pass.
      // This allows promoting staged verifiedRelation labels without needing --force.
      if (!dryRun && apply && edge.verifiedRelation) {
        edge.label = edge.verifiedRelation;
        delete edge.verifiedRelation;
        applied++;
      }
    }

    if (!dryRun && (scored > 0 || applied > 0)) {
      await saveGraph(basePath, graph);
    }

    return { status: 'success', scored, skipped, noEmbedding, verified, applied };
  } catch (err) {
    return {
      status: 'error',
      error: String(err),
      scored: 0,
      skipped: 0,
      noEmbedding: 0,
      verified: 0,
      applied: 0,
    };
  }
}
