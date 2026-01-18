/**
 * Bulk Delete Operation
 *
 * Delete multiple memories matching pattern, tags, type, or scope.
 * Uses batch index operations for O(1) index updates instead of O(n).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { BulkDeleteRequest, BulkDeleteResponse } from '../types/api.js';
import { loadIndex, batchRemoveFromIndex } from '../core/index.js';
import { deleteFile, fileExists, isInsideDir } from '../core/fs-utils.js';
import { filterMemories } from './pattern-matcher.js';
import { createLogger } from '../core/logger.js';
import type { EmbeddingCache } from '../search/embedding.js';

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

    // Load index once
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

    // Process file deletions (batch approach - delete files first, then update index once)
    const deletedIds: string[] = [];
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
        const filePath = path.join(basePath, memory.relativePath);

        // Security: Validate path stays within basePath (prevent path traversal)
        if (!isInsideDir(basePath, filePath)) {
          failedIds.push({ id: memory.id, reason: 'Path traversal not allowed' });
          continue;
        }

        if (await fileExists(filePath)) {
          await deleteFile(filePath);
          deletedIds.push(memory.id);
        } else {
          failedIds.push({ id: memory.id, reason: 'File not found' });
        }
      } catch (error) {
        failedIds.push({
          id: memory.id,
          reason: String(error),
        });
      }
    }

    // Single batch index update at the end (O(1) instead of O(n))
    if (deletedIds.length > 0) {
      await batchRemoveFromIndex(basePath, deletedIds);

      // Batch embeddings cleanup
      try {
        const embeddingsPath = path.join(basePath, 'embeddings.json');
        if (fs.existsSync(embeddingsPath)) {
          const content = fs.readFileSync(embeddingsPath, 'utf-8');
          const cache = JSON.parse(content) as EmbeddingCache;
          if (cache.memories) {
            let modified = false;
            for (const id of deletedIds) {
              if (cache.memories[id]) {
                delete cache.memories[id];
                modified = true;
              }
            }
            if (modified) {
              fs.writeFileSync(embeddingsPath, JSON.stringify(cache, null, 2));
            }
          }
        }
      } catch {
        // Embeddings cleanup is best-effort
        log.warn('Failed to clean up embeddings', { count: deletedIds.length });
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
