/**
 * Bulk Move Operation
 *
 * Move multiple memories matching pattern, tags, type, or sourceScope to a different scope.
 * Uses the existing moveMemory function for each individual move.
 */

import type { BulkMoveRequest, BulkMoveResponse } from '../types/operations.js';
import { loadIndex } from '../core/index.js';
import { moveMemory } from '../maintenance/move.js';
import { filterMemories } from './pattern-matcher.js';
import { createLogger } from '../core/logger.js';
import { getScopePath } from '../scope/resolver.js';

const log = createLogger('bulk-move');

/**
 * Move multiple memories matching criteria to a different scope
 */
export async function bulkMove(request: BulkMoveRequest): Promise<BulkMoveResponse> {
  // Validate targetScope is provided
  if (!request.targetScope) {
    return {
      status: 'error',
      error: 'targetScope is required',
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
  const globalPath = `${process.env.HOME}/.claude/memory`;

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

    // Skip memories already in target scope
    matches = matches.filter((m) => m.scope !== request.targetScope);

    if (matches.length === 0) {
      return {
        status: 'success',
        movedCount: 0,
        movedIds: [],
        failedIds: [],
        dryRun: request.dryRun,
      };
    }

    // Dry run - just return what would be moved
    if (request.dryRun) {
      log.info('Dry run: would move', {
        count: matches.length,
        ids: matches.map((m) => m.id),
        targetScope: request.targetScope,
      });
      return {
        status: 'success',
        movedCount: matches.length,
        movedIds: matches.map((m) => m.id),
        failedIds: [],
        dryRun: true,
      };
    }

    // Process moves
    const movedIds: string[] = [];
    const failedIds: Array<{ id: string; reason: string }> = [];

    for (let i = 0; i < matches.length; i++) {
      // Index is guaranteed valid within loop bounds
      const memory = matches[i]!;

      // Report progress
      request.onProgress?.({
        current: i + 1,
        total: matches.length,
        currentId: memory.id,
        phase: 'processing',
      });

      try {
        // Get source and target paths for move operation
        const sourceBasePath = getScopePath(memory.scope, basePath, globalPath);
        const targetBasePath = getScopePath(request.targetScope, basePath, globalPath);

        const result = await moveMemory({
          id: memory.id,
          sourceBasePath,
          targetBasePath,
          targetScope: request.targetScope,
        });

        if (result.status === 'success') {
          movedIds.push(memory.id);
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

    log.info('Bulk move complete', {
      moved: movedIds.length,
      failed: failedIds.length,
      targetScope: request.targetScope,
    });

    return {
      status: 'success',
      movedCount: movedIds.length,
      movedIds,
      failedIds: failedIds.length > 0 ? failedIds : undefined,
      dryRun: false,
    };
  } catch (error) {
    log.error('Bulk move failed', { error: String(error) });
    return {
      status: 'error',
      error: `Bulk move failed: ${String(error)}`,
    };
  }
}
