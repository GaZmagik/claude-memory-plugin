/**
 * T063: Semantic Search
 *
 * Search memories by meaning using embeddings.
 */

import * as path from 'node:path';
import { loadEmbeddingCache, generateEmbedding, type EmbeddingProvider } from './embedding.js';
import { findSimilarMemories } from './similarity.js';
import { loadIndex } from '../core/index.js';
import { unsafeAsMemoryId } from '../types/branded.js';
import type { MemoryType, Scope } from '../types/enums.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('semantic');

/**
 * Semantic search options
 */
export interface SemanticSearchOptions {
  query: string;
  basePath: string;
  provider: EmbeddingProvider;
  type?: MemoryType;
  scope?: Scope;
  threshold?: number;
  limit?: number;
}

/**
 * Semantic search result
 */
export interface SemanticSearchResult {
  id: string;
  type: MemoryType;
  title: string;
  tags: string[];
  scope?: Scope;
  score: number;
}

/**
 * Search memories by semantic similarity
 */
export async function semanticSearch(
  options: SemanticSearchOptions
): Promise<SemanticSearchResult[]> {
  const {
    query,
    basePath,
    provider,
    type,
    scope,
    threshold = 0.5,
    limit = 20,
  } = options;

  // Validate query
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  // Generate query embedding
  log.debug('Generating query embedding', { query: query.slice(0, 50) });
  const queryEmbedding = await generateEmbedding(query, provider);

  // Load embeddings cache
  const cachePath = path.join(basePath, 'embeddings.json');
  const cache = await loadEmbeddingCache(cachePath);

  // Build embeddings map
  const embeddings: Record<string, number[]> = {};
  for (const [id, entry] of Object.entries(cache.memories)) {
    embeddings[id] = entry.embedding;
  }

  // Find similar memories
  const similarMemories = findSimilarMemories(
    queryEmbedding,
    embeddings,
    threshold,
    undefined // Apply limit after filtering
  );

  // Load index for metadata
  const index = await loadIndex({ basePath });
  const indexMap = new Map(index.memories.map(e => [e.id, e]));

  // Build results with metadata
  const results: SemanticSearchResult[] = [];

  for (const similar of similarMemories) {
    const entry = indexMap.get(unsafeAsMemoryId(similar.id));
    if (!entry) {
      continue;
    }

    // Filter by type
    if (type && entry.type !== type) {
      continue;
    }

    // Filter by scope
    if (scope && entry.scope !== scope) {
      continue;
    }

    results.push({
      id: entry.id,
      type: entry.type,
      title: entry.title,
      tags: entry.tags,
      scope: entry.scope,
      score: similar.similarity,
    });

    // Check limit
    if (results.length >= limit) {
      break;
    }
  }

  log.debug('Semantic search complete', {
    query: query.slice(0, 50),
    results: results.length,
    threshold,
  });

  return results;
}

/**
 * Find memories similar to a given memory (for auto-linking)
 */
export async function findSimilarToMemory(
  memoryId: string,
  basePath: string,
  _provider: EmbeddingProvider,
  threshold: number = 0.85,
  limit: number = 5
): Promise<SemanticSearchResult[]> {
  // Load embeddings cache
  const cachePath = path.join(basePath, 'embeddings.json');
  const cache = await loadEmbeddingCache(cachePath);

  // Get target embedding
  const targetEntry = cache.memories[memoryId];
  if (!targetEntry) {
    log.warn('No embedding found for memory', { memoryId });
    return [];
  }

  // Build embeddings map (excluding target)
  const embeddings: Record<string, number[]> = {};
  for (const [id, entry] of Object.entries(cache.memories)) {
    if (id !== memoryId) {
      embeddings[id] = entry.embedding;
    }
  }

  // Find similar memories
  const similarMemories = findSimilarMemories(
    targetEntry.embedding,
    embeddings,
    threshold,
    limit
  );

  // Load index for metadata
  const index = await loadIndex({ basePath });
  const indexMap = new Map(index.memories.map(e => [e.id, e]));

  // Build results with metadata
  const results: SemanticSearchResult[] = [];

  for (const similar of similarMemories) {
    const entry = indexMap.get(unsafeAsMemoryId(similar.id));
    if (!entry) {
      continue;
    }

    results.push({
      id: entry.id,
      type: entry.type,
      title: entry.title,
      tags: entry.tags,
      scope: entry.scope,
      score: similar.similarity,
    });
  }

  return results;
}
