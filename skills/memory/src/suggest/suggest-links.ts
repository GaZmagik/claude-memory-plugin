/**
 * Suggest Links - Find potential relationships using embeddings
 *
 * Uses semantic similarity to suggest links between memories
 * that might be related but aren't yet connected.
 */

import * as path from 'node:path';
import { loadEmbeddingCache } from '../search/embedding.js';
import { findSimilarMemories } from '../search/similarity.js';
import { loadIndex } from '../core/index.js';
import { loadGraph, hasNode } from '../graph/structure.js';
import { linkMemories } from '../graph/link.js';
import { unsafeAsMemoryId } from '../types/branded.js';

/**
 * Suggested link
 */
export interface SuggestedLink {
  source: string;
  target: string;
  similarity: number;
  sourceTitle: string;
  targetTitle: string;
  reason: string;
}

/**
 * Suggest links request
 */
export interface SuggestLinksRequest {
  basePath: string;
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  /** Maximum suggestions to return */
  limit?: number;
  /** Automatically create suggested links */
  autoLink?: boolean;
}

/**
 * Suggest links response
 */
export interface SuggestLinksResponse {
  status: 'success' | 'error';
  /** Suggested links */
  suggestions: SuggestedLink[];
  /** Links auto-created (if autoLink=true) */
  created: number;
  /** Skipped (already linked) */
  skipped: number;
  /** Total pairs analysed */
  analysed: number;
  error?: string;
}

/**
 * Suggest potential links between memories
 */
export async function suggestLinks(
  request: SuggestLinksRequest
): Promise<SuggestLinksResponse> {
  const { basePath, threshold = 0.75, limit = 20, autoLink = false } = request;

  const suggestions: SuggestedLink[] = [];
  let created = 0;
  let skipped = 0;
  let analysed = 0;

  // Load embeddings cache
  const cachePath = path.join(basePath, 'embeddings.json');
  let cache;
  try {
    cache = await loadEmbeddingCache(cachePath);
  } catch {
    return {
      status: 'error',
      suggestions: [],
      created: 0,
      skipped: 0,
      analysed: 0,
      error: 'No embeddings cache found. Run semantic search to generate embeddings.',
    };
  }

  // Check cache has memories
  if (!cache.memories || Object.keys(cache.memories).length === 0) {
    return {
      status: 'success',
      suggestions: [],
      created: 0,
      skipped: 0,
      analysed: 0,
    };
  }

  // Filter out temporary memories (thoughts) - they're ephemeral and shouldn't be linked
  const memoryIds = Object.keys(cache.memories).filter(id => !id.startsWith('thought-'));
  if (memoryIds.length < 2) {
    return {
      status: 'success',
      suggestions: [],
      created: 0,
      skipped: 0,
      analysed: 0,
    };
  }

  // Load index for titles
  const index = await loadIndex({ basePath });
  const indexMap = new Map(index.memories.map(e => [e.id, e]));

  // Load graph for existing edges
  const graph = await loadGraph(basePath);

  // Build set of existing links
  const existingLinks = new Set<string>();
  for (const edge of graph.edges) {
    existingLinks.add(`${edge.source}:${edge.target}`);
    existingLinks.add(`${edge.target}:${edge.source}`); // Bidirectional check
  }

  // Build embeddings map (excluding thoughts)
  const embeddings: Record<string, number[]> = {};
  for (const [id, entry] of Object.entries(cache.memories)) {
    if (id.startsWith('thought-')) continue; // Skip temporary
    embeddings[id] = entry.embedding;
  }

  // Find similar pairs
  for (const sourceId of memoryIds) {
    const sourceEntry = cache.memories[sourceId];
    if (!sourceEntry) continue;
    const sourceEmbedding = sourceEntry.embedding;

    // Find similar memories
    const similar = findSimilarMemories(sourceEmbedding, embeddings, threshold, limit);

    for (const match of similar) {
      if (match.id === sourceId) continue;

      analysed++;

      // Check if already linked
      if (existingLinks.has(`${sourceId}:${match.id}`)) {
        skipped++;
        continue;
      }

      // Skip if not in graph
      if (!hasNode(graph, sourceId) || !hasNode(graph, match.id)) {
        continue;
      }

      const sourceEntry = indexMap.get(unsafeAsMemoryId(sourceId));
      const targetEntry = indexMap.get(unsafeAsMemoryId(match.id));

      if (!sourceEntry || !targetEntry) continue;

      suggestions.push({
        source: sourceId,
        target: match.id,
        similarity: match.similarity,
        sourceTitle: sourceEntry.title,
        targetTitle: targetEntry.title,
        reason: `Semantic similarity: ${(match.similarity * 100).toFixed(1)}%`,
      });

      // Mark as seen to avoid duplicates
      existingLinks.add(`${sourceId}:${match.id}`);
    }

    // Stop if we have enough
    if (suggestions.length >= limit) break;
  }

  // Sort by similarity (highest first)
  suggestions.sort((a, b) => b.similarity - a.similarity);

  // Trim to limit
  const finalSuggestions = suggestions.slice(0, limit);

  // Auto-link if requested
  if (autoLink && finalSuggestions.length > 0) {
    for (const suggestion of finalSuggestions) {
      try {
        await linkMemories({
          source: suggestion.source,
          target: suggestion.target,
          relation: 'auto-linked-by-similarity',
          basePath,
        });
        created++;
      } catch {
        // Link failed, skip
      }
    }
  }

  return {
    status: 'success',
    suggestions: finalSuggestions,
    created,
    skipped,
    analysed,
  };
}
