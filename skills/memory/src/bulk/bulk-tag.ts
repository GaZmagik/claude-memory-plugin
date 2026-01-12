/**
 * Bulk Tag Operation
 *
 * Add or remove tags from multiple memories matching pattern, tags, type, or scope.
 */

import type { BulkTagRequest, BulkTagResponse } from '../types/operations.js';
import { loadIndex } from '../core/index.js';
import { tagMemory, untagMemory } from '../core/tag.js';
import { filterMemories } from './pattern-matcher.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('bulk-tag');

/**
 * Add or remove tags from multiple memories matching criteria
 */
export async function bulkTag(request: BulkTagRequest): Promise<BulkTagResponse> {
  // Validate that at least one tag operation is specified
  if (!request.addTags?.length && !request.removeTags?.length) {
    return {
      status: 'error',
      error: 'At least one of addTags or removeTags is required',
    };
  }

  // Validate that at least one filter is provided
  if (
    !request.pattern &&
    !request.ids?.length &&
    !request.tags?.length &&
    !request.type &&
    !request.sourceScope
  ) {
    return {
      status: 'error',
      error: 'At least one filter criteria is required (pattern, ids, tags, type, or sourceScope)',
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

    // Load index once
    const index = await loadIndex({ basePath });

    // Filter memories by criteria
    let matches = filterMemories(index.memories, {
      pattern: request.pattern,
      tags: request.tags,
      type: request.type,
      scope: request.sourceScope,
    });

    // Additionally filter by explicit IDs if provided
    if (request.ids?.length) {
      const idSet = new Set(request.ids);
      matches = matches.filter((m) => idSet.has(m.id));
    }

    if (matches.length === 0) {
      return {
        status: 'success',
        modifiedCount: 0,
        modifiedIds: [],
        failedIds: [],
        dryRun: request.dryRun,
      };
    }

    // Dry run - just return what would be modified
    if (request.dryRun) {
      log.info('Dry run: would modify tags', {
        count: matches.length,
        ids: matches.map((m) => m.id),
        addTags: request.addTags,
        removeTags: request.removeTags,
      });
      return {
        status: 'success',
        modifiedCount: matches.length,
        modifiedIds: matches.map((m) => m.id),
        failedIds: [],
        dryRun: true,
      };
    }

    // Process tag operations
    const modifiedIds: string[] = [];
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

      try {
        let success = true;
        let errorReason = '';

        // Add tags if specified
        if (request.addTags?.length) {
          const addResult = await tagMemory({
            id: memory.id,
            tags: request.addTags,
            basePath,
          });
          if (addResult.status === 'error') {
            success = false;
            errorReason = addResult.error ?? 'Failed to add tags';
          }
        }

        // Remove tags if specified (only if add succeeded or wasn't requested)
        if (success && request.removeTags?.length) {
          const removeResult = await untagMemory({
            id: memory.id,
            tags: request.removeTags,
            basePath,
          });
          if (removeResult.status === 'error') {
            success = false;
            errorReason = removeResult.error ?? 'Failed to remove tags';
          }
        }

        if (success) {
          modifiedIds.push(memory.id);
        } else {
          failedIds.push({ id: memory.id, reason: errorReason });
        }
      } catch (error) {
        failedIds.push({
          id: memory.id,
          reason: String(error),
        });
      }
    }

    // Report completion
    request.onProgress?.({
      current: matches.length,
      total: matches.length,
      phase: 'complete',
    });

    log.info('Bulk tag complete', {
      modified: modifiedIds.length,
      failed: failedIds.length,
      addTags: request.addTags,
      removeTags: request.removeTags,
    });

    return {
      status: 'success',
      modifiedCount: modifiedIds.length,
      modifiedIds,
      failedIds: failedIds.length > 0 ? failedIds : undefined,
      dryRun: false,
    };
  } catch (error) {
    log.error('Bulk tag failed', { error: String(error) });
    return {
      status: 'error',
      error: `Bulk tag failed: ${String(error)}`,
    };
  }
}
