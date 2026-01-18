/**
 * Bulk Unlink Operation
 *
 * Remove links from multiple memories to a specific target.
 */

import type { BulkUnlinkRequest, BulkUnlinkResponse } from '../types/operations.js';
import { loadIndex } from '../core/index.js';
import { unlinkMemories } from '../graph/link.js';
import { filterMemories } from './pattern-matcher.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('bulk-unlink');

/**
 * Remove links from multiple memories matching criteria to a target
 */
export async function bulkUnlink(request: BulkUnlinkRequest): Promise<BulkUnlinkResponse> {
  // Validate target is provided
  if (!request.target) {
    return {
      status: 'error',
      error: 'target is required',
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
        unlinkedCount: 0,
        unlinkedPairs: [],
        failedIds: [],
        dryRun: request.dryRun,
      };
    }

    // Dry run - just return what would be unlinked
    if (request.dryRun) {
      const pairs = matches.map((m) => ({ source: m.id, target: request.target }));
      log.info('Dry run: would unlink', {
        count: matches.length,
        target: request.target,
      });
      return {
        status: 'success',
        unlinkedCount: matches.length,
        unlinkedPairs: pairs,
        failedIds: [],
        dryRun: true,
      };
    }

    // Process unlink operations
    const unlinkedPairs: Array<{ source: string; target: string }> = [];
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
        const result = await unlinkMemories({
          source: memory.id,
          target: request.target,
          relation: request.relation,
          basePath,
        });

        if (result.status === 'success') {
          unlinkedPairs.push({ source: memory.id, target: request.target });
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

    log.info('Bulk unlink complete', {
      unlinked: unlinkedPairs.length,
      failed: failedIds.length,
      target: request.target,
    });

    return {
      status: 'success',
      unlinkedCount: unlinkedPairs.length,
      unlinkedPairs,
      failedIds: failedIds.length > 0 ? failedIds : undefined,
      dryRun: false,
    };
  } catch (error) {
    log.error('Bulk unlink failed', { error: String(error) });
    return {
      status: 'error',
      error: `Bulk unlink failed: ${String(error)}`,
    };
  }
}
