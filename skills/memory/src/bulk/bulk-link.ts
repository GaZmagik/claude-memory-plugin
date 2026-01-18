/**
 * Bulk Link Operation
 *
 * Create links from multiple source memories to a single target.
 * Uses batch graph operations for O(1) graph updates instead of O(n).
 */

import type { BulkLinkRequest, BulkLinkResponse } from '../types/api.js';
import { loadIndex } from '../core/index.js';
import { loadGraph, saveGraph, addNode, hasNode } from '../graph/structure.js';
import { addEdge, hasEdge } from '../graph/edges.js';
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

    // Load index once for validation
    const index = await loadIndex({ basePath });

    // Verify target exists
    const targetEntry = index.memories.find(m => m.id === request.target);
    if (!targetEntry) {
      return {
        status: 'error',
        error: `Target memory not found: ${request.target}`,
      };
    }

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

    // Load graph once
    let graph = await loadGraph(basePath);

    // Ensure target node exists
    if (!hasNode(graph, request.target)) {
      graph = addNode(graph, { id: request.target, type: targetEntry.type });
    }

    // Process all links in memory (batch approach)
    const createdLinks: Array<{ source: string; target: string }> = [];
    const failedLinks: Array<{ source: string; reason: string }> = [];
    let existingCount = 0;

    for (let i = 0; i < sourceIds.length; i++) {
      // Index is guaranteed valid within loop bounds
      const sourceId = sourceIds[i]!;

      // Report progress
      request.onProgress?.({
        current: i + 1,
        total: sourceIds.length,
        currentId: sourceId,
        phase: 'processing',
      });

      // Verify source exists
      const sourceEntry = index.memories.find(m => m.id === sourceId);
      if (!sourceEntry) {
        failedLinks.push({ source: sourceId, reason: 'Source memory not found' });
        continue;
      }

      // Ensure source node exists
      if (!hasNode(graph, sourceId)) {
        graph = addNode(graph, { id: sourceId, type: sourceEntry.type });
      }

      // Check if edge already exists
      if (hasEdge(graph, sourceId, request.target, relation)) {
        existingCount++;
      } else {
        graph = addEdge(graph, sourceId, request.target, relation);
        createdLinks.push({ source: sourceId, target: request.target });
      }
    }

    // Single graph save at the end (O(1) instead of O(n))
    if (createdLinks.length > 0) {
      await saveGraph(basePath, graph);
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
