/**
 * Semantic Search API
 *
 * API layer for semantic search operations.
 */

import type {
  SemanticSearchRequest,
  SemanticSearchResponse,
  SemanticSearchResultItem,
} from '../types/api.js';
import { semanticSearch } from '../search/semantic.js';
import type { EmbeddingProvider } from '../search/embedding.js';
import { createLogger } from './logger.js';

const log = createLogger('semantic-search');

/**
 * Perform semantic search on memories
 */
export async function semanticSearchMemories(
  request: SemanticSearchRequest
): Promise<SemanticSearchResponse> {
  // Validate query
  if (!request.query || request.query.trim().length === 0) {
    return {
      status: 'error',
      error: 'query is required and cannot be empty',
    };
  }

  const basePath = request.basePath ?? process.cwd();
  const provider = request.provider as EmbeddingProvider;

  if (!provider) {
    return {
      status: 'error',
      error: 'Embedding provider is required',
    };
  }

  // Adjust threshold for auto-link mode
  const threshold = request.forAutoLink
    ? Math.max(request.threshold ?? 0.85, 0.8)
    : request.threshold ?? 0.5;

  try {
    const results = await semanticSearch({
      query: request.query.trim(),
      basePath,
      provider,
      type: request.type,
      scope: request.scope,
      threshold,
      limit: request.limit ?? 20,
    });

    // Map to API response format
    const responseResults: SemanticSearchResultItem[] = results.map(r => ({
      id: r.id,
      type: r.type,
      title: r.title,
      tags: r.tags,
      scope: r.scope,
      score: r.score,
    }));

    log.debug('Semantic search completed', {
      query: request.query.slice(0, 50),
      results: responseResults.length,
    });

    return {
      status: 'success',
      results: responseResults,
    };
  } catch (error) {
    log.error('Semantic search failed', { error: String(error) });
    return {
      status: 'error',
      error: `Semantic search failed: ${String(error)}`,
    };
  }
}
