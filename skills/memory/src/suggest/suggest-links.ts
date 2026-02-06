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
import { resolveSharedScopePaths } from '../cli/helpers.js';

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
  /** Include shared scope memories */
  includeShared?: boolean;
  /** Agent name (for multi-scope loading) */
  agentName?: string;
  /** Scope string for agent scoping */
  scopeStr?: string;
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
  const { basePath, threshold = 0.75, limit = 20, autoLink = false, includeShared = false, agentName, scopeStr } = request;

  const suggestions: SuggestedLink[] = [];
  let created = 0;
  let skipped = 0;
  let analysed = 0;

  // Load embeddings cache(s)
  const embeddings: Record<string, number[]> = {};
  const indexMap = new Map<string, any>();
  let graph = await loadGraph(basePath);
  const existingLinks = new Set<string>();

  // Load primary (agent or project) embeddings
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

  // Load index for primary basePath
  const index = await loadIndex({ basePath });
  for (const entry of index.memories) {
    indexMap.set(entry.id, entry);
  }

  // Build embeddings map from primary scope (excluding thoughts)
  for (const [id, entry] of Object.entries(cache.memories)) {
    if (id.startsWith('thought-')) continue; // Skip temporary
    embeddings[id] = entry.embedding;
  }

  // Build set of existing links from primary graph
  for (const edge of graph.edges) {
    existingLinks.add(`${edge.source}:${edge.target}`);
    existingLinks.add(`${edge.target}:${edge.source}`); // Bidirectional check
  }

  // When --include-shared, load embeddings from shared scopes
  if (includeShared && agentName) {
    try {
      const sharedPaths = resolveSharedScopePaths(agentName, scopeStr);
      // sharedPaths[0] is the agent path (already loaded), rest are shared scopes
      for (const sharedPath of sharedPaths.slice(1)) {
        if (sharedPath !== basePath) {
          // Load embeddings from shared scope
          const sharedCachePath = path.join(sharedPath, 'embeddings.json');
          let sharedCache;
          try {
            sharedCache = await loadEmbeddingCache(sharedCachePath);
          } catch {
            // Shared scope might not have embeddings, skip
            continue;
          }

          // Add embeddings from shared scope
          for (const [id, entry] of Object.entries(sharedCache.memories)) {
            if (id.startsWith('thought-')) continue;
            if (!embeddings[id]) {
              embeddings[id] = entry.embedding;
            }
          }

          // Load index from shared scope
          const sharedIndex = await loadIndex({ basePath: sharedPath });
          for (const entry of sharedIndex.memories) {
            if (!indexMap.has(entry.id)) {
              indexMap.set(entry.id, entry);
            }
          }

          // Load graph from shared scope and merge edges
          const sharedGraph = await loadGraph(sharedPath);
          for (const edge of sharedGraph.edges) {
            existingLinks.add(`${edge.source}:${edge.target}`);
            existingLinks.add(`${edge.target}:${edge.source}`);
          }
        }
      }
    } catch {
      // Shared scope loading failed, continue with primary scope
    }
  }

  // Filter out temporary memories (thoughts)
  const memoryIds = Object.keys(embeddings).filter(id => !id.startsWith('thought-'));
  if (memoryIds.length < 2) {
    return {
      status: 'success',
      suggestions: [],
      created: 0,
      skipped: 0,
      analysed: 0,
    };
  }

  // Find similar pairs
  for (const sourceId of memoryIds) {
    if (!embeddings[sourceId]) continue;
    const sourceEmbedding = embeddings[sourceId];

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

      // For --include-shared, we allow cross-scope suggestions (but won't auto-link them)
      // For single-scope, check if both are in the graph
      if (!includeShared) {
        if (!hasNode(graph, sourceId) || !hasNode(graph, match.id)) {
          continue;
        }
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
  // Important: Auto-link only works within the primary scope (basePath)
  // Cross-scope suggestions are discovered but not persisted
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
