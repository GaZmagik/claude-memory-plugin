/**
 * Bulk Promote Operation
 *
 * Promote or demote multiple memories to a different type.
 */

import type { BulkPromoteRequest, BulkPromoteResponse } from '../types/operations.js';
import { loadIndex } from '../core/index.js';
import { promoteMemory } from '../maintenance/promote.js';
import { filterMemories } from './pattern-matcher.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('bulk-promote');

/**
 * Promote or demote multiple memories matching criteria to a different type
 */
export async function bulkPromote(request: BulkPromoteRequest): Promise<BulkPromoteResponse> {
  // Validate targetType is provided
  if (!request.targetType) {
    return {
      status: 'error',
      error: 'targetType is required',
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

    // Skip memories already of target type
    matches = matches.filter((m) => m.type !== request.targetType);

    if (matches.length === 0) {
      return {
        status: 'success',
        promotedCount: 0,
        promotedIds: [],
        failedIds: [],
        dryRun: request.dryRun,
      };
    }

    // Dry run - just return what would be promoted
    if (request.dryRun) {
      log.info('Dry run: would promote', {
        count: matches.length,
        ids: matches.map((m) => m.id),
        targetType: request.targetType,
      });
      return {
        status: 'success',
        promotedCount: matches.length,
        promotedIds: matches.map((m) => m.id),
        failedIds: [],
        dryRun: true,
      };
    }

    // Process promote operations
    const promotedIds: string[] = [];
    const failedIds: Array<{ id: string; reason: string }> = [];

    for (let i = 0; i < matches.length; i++) {
      const memory = matches[i]!; // Index is guaranteed valid by loop condition

      // Report progress
      request.onProgress?.({
        current: i + 1,
        total: matches.length,
        currentId: memory.id,
        phase: 'processing',
      });

      try {
        const result = await promoteMemory({
          id: memory.id,
          targetType: request.targetType,
          basePath,
        });

        if (result.status === 'success') {
          promotedIds.push(memory.id);
        } else {
          failedIds.push({
            id: memory.id,
            reason: result.error ?? 'Unknown error',
          });
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

    log.info('Bulk promote complete', {
      promoted: promotedIds.length,
      failed: failedIds.length,
      targetType: request.targetType,
    });

    return {
      status: 'success',
      promotedCount: promotedIds.length,
      promotedIds,
      failedIds: failedIds.length > 0 ? failedIds : undefined,
      dryRun: false,
    };
  } catch (error) {
    log.error('Bulk promote failed', { error: String(error) });
    return {
      status: 'error',
      error: `Bulk promote failed: ${String(error)}`,
    };
  }
}
