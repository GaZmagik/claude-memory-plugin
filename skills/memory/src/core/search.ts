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
import { resolveBasePath } from '../scope/resolve-base-path.js';

const log = createLogger('search');

/** Scoring weights for keyword relevance ranking */
const SCORE_TITLE_MATCH = 0.5;
const SCORE_TITLE_EXACT_BONUS = 0.3;
const SCORE_TAG_MATCH = 0.3;
const SCORE_CONTENT_MATCH = 0.2;
const SCORE_OCCURRENCE_BONUS = 0.02;
const SCORE_OCCURRENCE_CAP = 0.1;

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
    score += SCORE_TITLE_MATCH;
    // Bonus for exact title match
    if (title.toLowerCase() === queryLower) {
      score += SCORE_TITLE_EXACT_BONUS;
    }
  }

  // Tag match (high weight)
  if (tags.some(tag => tag.toLowerCase().includes(queryLower))) {
    score += SCORE_TAG_MATCH;
  }

  // Content match (lower weight)
  if (content.toLowerCase().includes(queryLower)) {
    score += SCORE_CONTENT_MATCH;

    // Bonus for multiple occurrences (diminishing returns)
    const occurrences = content.toLowerCase().split(queryLower).length - 1;
    score += Math.min(occurrences * SCORE_OCCURRENCE_BONUS, SCORE_OCCURRENCE_CAP);
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
 * Search memories by keyword matching in title, content, and tags.
 *
 * Performs case-insensitive keyword search across all indexed memories,
 * returning results ranked by relevance score. The search matches against
 * memory titles (highest weight), tags (medium weight), and content (lower weight).
 *
 * Supports both traditional scopes (project, global, local) and agent scopes
 * (agent-project, agent-global). When using agent scopes:
 *
 * - Requires `request.agent` to specify the agent name
 * - Agent-project scope: searches project's `.claude/memory/agents/<name>/`
 * - Agent-global scope: searches user's `~/.claude/memory/agents/<name>/`
 *
 * @param request - Search request containing the query string and optional filters
 * @param request.query - The search query string (required, max 10,000 characters)
 * @param request.basePath - Base path for memory storage (defaults to cwd)
 * @param request.scope - Optional scope filter (project, global, local, agent-project, agent-global)
 * @param request.agent - Agent name (required when using agent scopes)
 * @param request.type - Optional memory type filter (learning, decision, gotcha, etc.)
 * @param request.limit - Maximum number of results to return (defaults to 20)
 *
 * @returns {Promise<SearchMemoriesResponse>} Response object containing:
 *   - `status`: 'success' or 'error'
 *   - `results`: Array of {@link SearchResult} objects with id, title, score, and snippet
 *   - `error`: Error message if status is 'error'
 *
 * @throws Never throws directly; errors are returned in the response object
 *
 * @example
 * // Basic search in project scope
 * const result = await searchMemories({
 *   query: 'typescript generics',
 *   basePath: '/path/to/project/.claude/memory'
 * });
 * if (result.status === 'success') {
 *   console.log(`Found ${result.results.length} memories`);
 *   result.results.forEach(r => console.log(`${r.title} (score: ${r.score})`));
 * }
 *
 * @example
 * // Search within a specific agent's memories with filters
 * const result = await searchMemories({
 *   query: 'API design patterns',
 *   scope: Scope.AgentProject,
 *   agent: 'api-architect',
 *   type: MemoryType.Decision,
 *   limit: 10
 * });
 */
export async function searchMemories(request: SearchMemoriesRequest): Promise<SearchMemoriesResponse> {
  const MAX_QUERY_LENGTH = 10000;

  // Validate query
  if (!request.query || request.query.trim().length === 0) {
    return {
      status: 'error',
      error: 'query is required',
    };
  }

  // Check query length
  if (request.query.length > MAX_QUERY_LENGTH) {
    return {
      status: 'error',
      error: `Query too long (max ${MAX_QUERY_LENGTH} characters)`,
    };
  }

  const query = request.query.trim();

  // Resolve base path (handles both regular and agent scopes)
  const basePathResult = resolveBasePath(request);
  if (basePathResult.error) {
    return { status: 'error', error: basePathResult.error };
  }
  const basePath = basePathResult.basePath;

  try {
    const index = await loadIndex({ basePath });

    let entries = [...index.memories];

    // Filter by type
    if (request.type) {
      entries = entries.filter(e => e.type === request.type);
    }

    // Filter by scope
    if (request.scope) {
      entries = entries.filter(e => e.scope === request.scope);
    }

    const results: SearchResult[] = [];

    const queryLower = query.toLowerCase();

    for (const entry of entries) {
      // First, check if title or tags match (quick check from index)
      const titleMatch = entry.title.toLowerCase().includes(queryLower);
      const tagMatch = entry.tags.some(t => t.toLowerCase().includes(queryLower));

      // Read content only if title/tags didn't match (avoid unnecessary I/O)
      const filePath = entry.externalPath
        ? entry.externalPath
        : path.join(basePath, entry.relativePath);
      let content = '';
      let contentMatch = false;

      if (titleMatch || tagMatch) {
        // Title or tag matched — still read content for scoring and snippet extraction
        if (await fileExists(filePath)) {
          try {
            const fileContent = await readFile(filePath);
            // External files are plain markdown without frontmatter
            if (entry.externalPath) {
              content = fileContent;
            } else {
              const parsed = parseMemoryFile(fileContent);
              content = parsed.content;
            }
          } catch {
            // Use empty content for scoring if file can't be parsed
          }
        }
        contentMatch = content.toLowerCase().includes(queryLower);
      } else {
        // No index match — read file to check content as last resort
        if (await fileExists(filePath)) {
          try {
            const fileContent = await readFile(filePath);
            // External files are plain markdown without frontmatter
            if (entry.externalPath) {
              content = fileContent;
            } else {
              const parsed = parseMemoryFile(fileContent);
              content = parsed.content;
            }
          } catch {
            // Skip files that can't be parsed
            continue;
          }
        }
        contentMatch = content.toLowerCase().includes(queryLower);

        // No match anywhere — skip entirely
        if (!contentMatch) {
          continue;
        }
      }

      const score = calculateScore(query, entry.title, content, entry.tags);
      const snippet = extractSnippet(content, query);

      results.push({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        tags: entry.tags,
        scope: entry.scope,
        agent: entry.agent,
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
