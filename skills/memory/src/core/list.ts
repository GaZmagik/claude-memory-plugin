/**
 * T030: Memory List Operation
 *
 * List memories with filtering and sorting.
 */

import type { ListMemoriesRequest, ListMemoriesResponse, MemorySummary } from '../types/api.js';
import { loadIndex } from './index.js';
import { createLogger } from './logger.js';

const log = createLogger('list');

/**
 * List memories with optional filtering and sorting.
 *
 * Retrieves memory summaries from the index with support for filtering by type,
 * scope, and tags. Results can be sorted by creation date, update date, or title.
 *
 * Supports both traditional scopes (project, global, local) and agent scopes
 * (agent-project, agent-global). When using agent scopes:
 *
 * - Requires `request.agent` to specify the agent name
 * - Agent-project scope: lists from project's `.claude/memory/agents/<name>/`
 * - Agent-global scope: lists from user's `~/.claude/memory/agents/<name>/`
 *
 * @param request - List request containing optional filters and sorting options
 * @param request.basePath - Base path for memory storage (defaults to cwd)
 * @param request.type - Filter by memory type (learning, decision, gotcha, etc.)
 * @param request.scope - Filter by scope (project, global, local, agent-project, agent-global)
 * @param request.tag - Filter by a single tag (exact match)
 * @param request.tags - Filter by multiple tags with AND logic (all must match)
 * @param request.sortBy - Sort field: 'created', 'updated', or 'title' (defaults to 'created')
 * @param request.sortOrder - Sort direction: 'asc' or 'desc' (defaults to 'desc')
 * @param request.limit - Maximum number of results to return (no limit if unspecified)
 *
 * @returns {Promise<ListMemoriesResponse>} Response object containing:
 *   - `status`: 'success' or 'error'
 *   - `memories`: Array of {@link MemorySummary} objects
 *   - `count`: Total number of memories matching filters (before limit applied)
 *   - `error`: Error message if status is 'error'
 *
 * @throws Never throws directly; errors are returned in the response object
 *
 * @example
 * // List all memories sorted by most recently updated
 * const result = await listMemories({
 *   basePath: '/path/to/project/.claude/memory',
 *   sortBy: 'updated',
 *   sortOrder: 'desc'
 * });
 * if (result.status === 'success') {
 *   console.log(`Total memories: ${result.count}`);
 *   result.memories.forEach(m => console.log(`${m.title} [${m.type}]`));
 * }
 *
 * @example
 * // List gotchas with specific tags for an agent
 * const result = await listMemories({
 *   scope: Scope.AgentProject,
 *   agent: 'typescript-expert',
 *   type: MemoryType.Gotcha,
 *   tags: ['async', 'error-handling'],
 *   limit: 5
 * });
 */
export async function listMemories(request: ListMemoriesRequest): Promise<ListMemoriesResponse> {
  const basePath = request.basePath ?? process.cwd();

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

    // Filter by single tag
    if (request.tag) {
      entries = entries.filter(e => e.tags.includes(request.tag!));
    }

    // Filter by multiple tags (AND logic)
    if (request.tags && request.tags.length > 0) {
      entries = entries.filter(e =>
        request.tags!.every(tag => e.tags.includes(tag))
      );
    }

    // Sort
    const sortBy = request.sortBy ?? 'created';
    const sortOrder = request.sortOrder ?? 'desc';

    entries.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'created') {
        comparison = new Date(a.created).getTime() - new Date(b.created).getTime();
      } else if (sortBy === 'updated') {
        comparison = new Date(a.updated).getTime() - new Date(b.updated).getTime();
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const totalCount = entries.length;

    // Apply limit
    if (request.limit && request.limit > 0) {
      entries = entries.slice(0, request.limit);
    }

    // Convert to MemorySummary
    const memories: MemorySummary[] = entries.map(e => ({
      id: e.id,
      type: e.type,
      title: e.title,
      tags: e.tags,
      scope: e.scope,
      created: e.created,
      updated: e.updated,
      relativePath: e.relativePath,
      severity: e.severity,
    }));

    log.debug('Listed memories', { count: memories.length, total: totalCount });

    return {
      status: 'success',
      memories,
      count: totalCount,
    };
  } catch (error) {
    log.error('Failed to list memories', { error: String(error) });
    return {
      status: 'error',
      error: `Failed to list memories: ${String(error)}`,
    };
  }
}
