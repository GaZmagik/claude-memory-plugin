/**
 * Bulk Link Operation
 *
 * Create links from multiple source memories to a single target.
 */

import type { BulkLinkRequest, BulkLinkResponse } from '../types/api.js';
import { loadIndex } from '../core/index.js';
import { linkMemories } from '../graph/link.js';
import { filterMemories } from './pattern-matcher.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('bulk-link');

const DEFAULT_RELATION = 'relates-to';

/**
 * Create links from multiple sources to a single target
 */
export async function bulkLink(request: BulkLinkRequest): Promise<BulkLinkResponse> {
  // Validate target
  if (!request.target || request.target.trim().length === 0) {
    return {
      status: 'error',
      error: 'target is required',
    };
  }

  // Validate that at least one source specifier is provided
  if (!request.sourcePattern && (!request.sourceIds || request.sourceIds.length === 0)) {
    return {
      status: 'error',
      error: 'Either sourcePattern or sourceIds is required',
    };
  }

  const basePath = request.basePath ?? process.cwd();
  const relation = request.relation ?? DEFAULT_RELATION;

  try {
    // Report scanning phase
    request.onProgress?.({
      current: 0,
      total: 0,
      phase: 'scanning',
    });

    // Load index
    const index = await loadIndex({ basePath });

    // Find source memories
    let sourceIds: string[];

    if (request.sourceIds && request.sourceIds.length > 0) {
      // Use provided IDs directly
      sourceIds = request.sourceIds;
    } else if (request.sourcePattern) {
      // Filter by pattern
      const matches = filterMemories(index.memories, { pattern: request.sourcePattern });
      sourceIds = matches.map(m => m.id);
    } else {
      sourceIds = [];
    }

    // Exclude target from sources (can't link to self)
    sourceIds = sourceIds.filter(id => id !== request.target);

    if (sourceIds.length === 0) {
      return {
        status: 'success',
        createdCount: 0,
        createdLinks: [],
        existingCount: 0,
        dryRun: request.dryRun,
      };
    }

    // Dry run - just return what would be linked
    if (request.dryRun) {
      log.info('Dry run: would link', { count: sourceIds.length, target: request.target });
      return {
        status: 'success',
        createdCount: sourceIds.length,
        createdLinks: sourceIds.map(source => ({ source, target: request.target })),
        existingCount: 0,
        dryRun: true,
      };
    }

    // Process links
    const createdLinks: Array<{ source: string; target: string }> = [];
    const failedLinks: Array<{ source: string; reason: string }> = [];
    let existingCount = 0;

    for (let i = 0; i < sourceIds.length; i++) {
      const sourceId = sourceIds[i];

      // Report progress
      request.onProgress?.({
        current: i + 1,
        total: sourceIds.length,
        currentId: sourceId,
        phase: 'processing',
      });

      // Attempt to create link
      const result = await linkMemories({
        source: sourceId,
        target: request.target,
        relation,
        basePath,
      });

      if (result.status === 'success') {
        if (result.alreadyExists) {
          existingCount++;
        } else {
          createdLinks.push({ source: sourceId, target: request.target });
        }
      } else {
        failedLinks.push({
          source: sourceId,
          reason: result.error ?? 'Unknown error',
        });
      }
    }

    // Report completion
    request.onProgress?.({
      current: sourceIds.length,
      total: sourceIds.length,
      phase: 'complete',
    });

    log.info('Bulk link complete', {
      created: createdLinks.length,
      existing: existingCount,
      failed: failedLinks.length,
    });

    return {
      status: 'success',
      createdCount: createdLinks.length,
      createdLinks,
      existingCount,
      failedLinks: failedLinks.length > 0 ? failedLinks : undefined,
      dryRun: false,
    };
  } catch (error) {
    log.error('Bulk link failed', { error: String(error) });
    return {
      status: 'error',
      error: `Bulk link failed: ${String(error)}`,
    };
  }
}
