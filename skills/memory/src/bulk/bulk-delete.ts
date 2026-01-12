/**
 * Bulk Delete Operation
 *
 * Delete multiple memories matching pattern, tags, type, or scope.
 */

import type { BulkDeleteRequest, BulkDeleteResponse } from '../types/api.js';
import { loadIndex } from '../core/index.js';
import { deleteMemory } from '../core/delete.js';
import { filterMemories } from './pattern-matcher.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('bulk-delete');

/**
 * Delete multiple memories matching criteria
 */
export async function bulkDelete(request: BulkDeleteRequest): Promise<BulkDeleteResponse> {
  // Validate that at least one filter is provided
  if (!request.pattern && !request.tags?.length && !request.type && !request.scope) {
    return {
      status: 'error',
      error: 'At least one filter criteria is required (pattern, tags, type, or scope)',
    };
  }

  const basePath = request.basePath ?? process.cwd();

  try {
    // Report scanning phase
    request.onProgress?.({
      current: 0,
      total: 0,
      phase: 'scanning',
    });

    // Load index
    const index = await loadIndex({ basePath });

    // Filter memories by criteria
    const matches = filterMemories(index.memories, {
      pattern: request.pattern,
      tags: request.tags,
      type: request.type,
      scope: request.scope,
    });

    if (matches.length === 0) {
      return {
        status: 'success',
        deletedCount: 0,
        deletedIds: [],
        failedIds: [],
        dryRun: request.dryRun,
      };
    }

    // Dry run - just return what would be deleted
    if (request.dryRun) {
      log.info('Dry run: would delete', { count: matches.length, ids: matches.map(m => m.id) });
      return {
        status: 'success',
        deletedCount: matches.length,
        deletedIds: matches.map(m => m.id),
        failedIds: [],
        dryRun: true,
      };
    }

    // Process deletions
    const deletedIds: string[] = [];
    const failedIds: Array<{ id: string; reason: string }> = [];

    for (let i = 0; i < matches.length; i++) {
      const memory = matches[i];

      // Report progress
      request.onProgress?.({
        current: i + 1,
        total: matches.length,
        currentId: memory.id,
        phase: 'processing',
      });

      // Attempt deletion
      const result = await deleteMemory({
        id: memory.id,
        basePath,
      });

      if (result.status === 'success') {
        deletedIds.push(memory.id);
      } else {
        failedIds.push({
          id: memory.id,
          reason: result.error ?? 'Unknown error',
        });
      }
    }

    // Report completion
    request.onProgress?.({
      current: matches.length,
      total: matches.length,
      phase: 'complete',
    });

    log.info('Bulk delete complete', {
      deleted: deletedIds.length,
      failed: failedIds.length,
    });

    // Consider success if at least some deletions succeeded
    // The failedIds array indicates partial success when present
    return {
      status: 'success',
      deletedCount: deletedIds.length,
      deletedIds,
      failedIds: failedIds.length > 0 ? failedIds : undefined,
      dryRun: false,
    };
  } catch (error) {
    log.error('Bulk delete failed', { error: String(error) });
    return {
      status: 'error',
      error: `Bulk delete failed: ${String(error)}`,
    };
  }
}
