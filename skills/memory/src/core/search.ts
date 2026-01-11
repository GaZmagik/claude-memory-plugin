/**
 * T031: Memory Keyword Search
 *
 * Search memories by keyword matching in title, content, and tags.
 */

import * as path from 'node:path';
import type { SearchMemoriesRequest, SearchMemoriesResponse, SearchResult } from '../types/api.js';
import { loadIndex } from './index.js';
import { readFile, fileExists } from './fs-utils.js';
import { parseMemoryFile } from './frontmatter.js';
import { createLogger } from './logger.js';

const log = createLogger('search');

/**
 * Calculate relevance score for a match
 */
function calculateScore(
  query: string,
  title: string,
  content: string,
  tags: string[]
): number {
  const queryLower = query.toLowerCase();
  let score = 0;

  // Title match (highest weight)
  if (title.toLowerCase().includes(queryLower)) {
    score += 0.5;
    // Bonus for exact title match
    if (title.toLowerCase() === queryLower) {
      score += 0.3;
    }
  }

  // Tag match (high weight)
  if (tags.some(tag => tag.toLowerCase().includes(queryLower))) {
    score += 0.3;
  }

  // Content match (lower weight)
  if (content.toLowerCase().includes(queryLower)) {
    score += 0.2;

    // Bonus for multiple occurrences (diminishing returns)
    const occurrences = content.toLowerCase().split(queryLower).length - 1;
    score += Math.min(occurrences * 0.02, 0.1);
  }

  return Math.min(score, 1.0);
}

/**
 * Extract a snippet around the first match
 */
function extractSnippet(content: string, query: string, maxLength: number = 150): string | undefined {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  const matchIndex = contentLower.indexOf(queryLower);

  if (matchIndex === -1) {
    return undefined;
  }

  // Calculate snippet boundaries
  const start = Math.max(0, matchIndex - 50);
  const end = Math.min(content.length, matchIndex + query.length + 100);

  let snippet = content.slice(start, end).trim();

  // Add ellipsis if truncated
  if (start > 0) {
    snippet = '...' + snippet;
  }
  if (end < content.length) {
    snippet = snippet + '...';
  }

  // Truncate if still too long
  if (snippet.length > maxLength) {
    snippet = snippet.slice(0, maxLength - 3) + '...';
  }

  return snippet;
}

/**
 * Search memories by keyword
 */
export async function searchMemories(request: SearchMemoriesRequest): Promise<SearchMemoriesResponse> {
  // Validate query
  if (!request.query || request.query.trim().length === 0) {
    return {
      status: 'error',
      error: 'query is required',
    };
  }

  const basePath = request.basePath ?? process.cwd();
  const query = request.query.trim();

  try {
    const index = await loadIndex({ basePath });

    let entries = [...index.entries];

    // Filter by type
    if (request.type) {
      entries = entries.filter(e => e.type === request.type);
    }

    // Filter by scope
    if (request.scope) {
      entries = entries.filter(e => e.scope === request.scope);
    }

    const results: SearchResult[] = [];

    for (const entry of entries) {
      // First, check if title or tags match (quick check from index)
      const titleMatch = entry.title.toLowerCase().includes(query.toLowerCase());
      const tagMatch = entry.tags.some(t => t.toLowerCase().includes(query.toLowerCase()));

      // Read content for content match and snippet extraction
      const filePath = path.join(basePath, entry.relativePath);
      let content = '';

      if (fileExists(filePath)) {
        try {
          const fileContent = readFile(filePath);
          const parsed = parseMemoryFile(fileContent);
          content = parsed.content;
        } catch {
          // Skip files that can't be parsed
          continue;
        }
      }

      const contentMatch = content.toLowerCase().includes(query.toLowerCase());

      // Skip if no match
      if (!titleMatch && !tagMatch && !contentMatch) {
        continue;
      }

      const score = calculateScore(query, entry.title, content, entry.tags);
      const snippet = extractSnippet(content, query);

      results.push({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        tags: entry.tags,
        scope: entry.scope,
        score,
        snippet,
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    const limit = request.limit ?? 20;
    const limitedResults = results.slice(0, limit);

    log.debug('Search completed', { query, results: limitedResults.length });

    return {
      status: 'success',
      results: limitedResults,
    };
  } catch (error) {
    log.error('Failed to search memories', { query, error: String(error) });
    return {
      status: 'error',
      error: `Failed to search memories: ${String(error)}`,
    };
  }
}
