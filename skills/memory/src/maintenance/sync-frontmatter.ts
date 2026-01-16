/**
 * Sync Frontmatter - Bulk sync frontmatter from graph.json
 *
 * Updates YAML frontmatter in memory files to match the graph state.
 * Specifically syncs:
 * - links: Outbound edges from graph → frontmatter links array
 *
 * Use when graph.json has been modified directly or after bulk link operations.
 */

import * as fs from 'node:fs';
import {
  parseMemoryFile,
  serialiseMemoryFile,
  updateFrontmatter,
} from '../core/frontmatter.js';
import { getAllMemoryIds, findMemoryFile } from '../core/fs-utils.js';
import { loadGraph } from '../graph/structure.js';
import { getOutboundEdges } from '../graph/edges.js';

/**
 * Sync frontmatter request options
 */
export interface SyncFrontmatterRequest {
  /** Base path for memory storage */
  basePath: string;
  /** Dry run - report changes without applying */
  dryRun?: boolean;
  /** Only sync specific IDs (optional) */
  ids?: string[];
}

/**
 * Sync frontmatter response
 */
export interface SyncFrontmatterResponse {
  status: 'success' | 'error';
  /** Number of files updated */
  updated: number;
  /** IDs of files updated */
  updatedIds: string[];
  /** Files that would be updated (dry run only) */
  wouldUpdate?: string[];
  /** Files skipped (no changes needed) */
  skipped: number;
  /** Any errors encountered */
  errors?: string[];
}

/**
 * Check if two arrays have the same elements (order-independent)
 */
function arraysEqual(a: string[] | undefined, b: string[]): boolean {
  const aSet = new Set(a ?? []);
  const bSet = new Set(b);

  if (aSet.size !== bSet.size) return false;

  for (const item of aSet) {
    if (!bSet.has(item)) return false;
  }

  return true;
}

/**
 * Sync frontmatter from graph for all memories
 */
export async function syncFrontmatter(
  request: SyncFrontmatterRequest
): Promise<SyncFrontmatterResponse> {
  const { basePath, dryRun = false, ids } = request;

  const errors: string[] = [];
  const updatedIds: string[] = [];
  const wouldUpdate: string[] = [];
  let skipped = 0;

  // Load graph
  const graph = await loadGraph(basePath);

  // Get IDs to process
  const idsToProcess = ids ?? getAllMemoryIds(basePath);

  for (const id of idsToProcess) {
    try {
      // Find file
      const filePath = findMemoryFile(basePath, id);
      if (!filePath) {
        // File doesn't exist, skip silently
        continue;
      }

      // Get outbound links from graph
      const outboundEdges = getOutboundEdges(graph, id);
      const graphLinks = outboundEdges.map(e => e.target);

      // Read current file
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = parseMemoryFile(content);

      if (!parsed.frontmatter) {
        errors.push(`${id}: Failed to parse frontmatter`);
        continue;
      }

      // Check if links need updating
      const currentLinks = parsed.frontmatter.links ?? [];
      if (arraysEqual(currentLinks, graphLinks)) {
        skipped++;
        continue;
      }

      // Update needed
      if (dryRun) {
        wouldUpdate.push(id);
      } else {
        // Update frontmatter with new links
        const updatedFm = updateFrontmatter(parsed.frontmatter, {
          links: graphLinks.length > 0 ? graphLinks : undefined,
        });

        // Serialise and write
        const newContent = serialiseMemoryFile(updatedFm, parsed.content);
        fs.writeFileSync(filePath, newContent, 'utf8');
        updatedIds.push(id);
      }
    } catch (err) {
      errors.push(`${id}: ${err}`);
    }
  }

  return {
    status: errors.length > 0 ? 'error' : 'success',
    updated: updatedIds.length,
    updatedIds,
    ...(dryRun && { wouldUpdate }),
    skipped,
    ...(errors.length > 0 && { errors }),
  };
}
