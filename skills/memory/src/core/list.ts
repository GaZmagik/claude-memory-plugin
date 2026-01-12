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
 * List memories with optional filters
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
