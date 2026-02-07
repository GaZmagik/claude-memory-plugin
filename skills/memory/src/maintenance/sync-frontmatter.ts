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
import type { MemoryId } from '../types/branded.js';

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
 * Synchronises YAML frontmatter in memory files to match the graph state.
 *
 * This function updates memory files so their frontmatter `links` array
 * matches the outbound edges defined in graph.json. Use this after the
 * graph has been modified directly or following bulk link operations.
 *
 * The sync is order-independent: links are compared as sets, so reordering
 * alone does not trigger an update.
 *
 * @param request - The sync frontmatter request options
 * @param request.basePath - The base path for memory storage
 * @param request.dryRun - If true, reports changes without applying them
 * @param request.ids - Optional array of specific IDs to sync; if omitted, syncs all
 * @returns A promise resolving to a SyncFrontmatterResponse with counts of
 *          updated and skipped files, plus lists of affected IDs
 * @throws Never throws directly; errors are captured in the response object
 *
 * @example
 * ```typescript
 * import { syncFrontmatter } from './maintenance/sync-frontmatter.js';
 *
 * // Preview which files would be updated
 * const preview = await syncFrontmatter({
 *   basePath: '/project/.claude/memory',
 *   dryRun: true,
 * });
 *
 * console.log(`Would update ${preview.wouldUpdate?.length ?? 0} files`);
 * console.log(`Skipping ${preview.skipped} files (already in sync)`);
 *
 * // Sync specific memories only
 * const result = await syncFrontmatter({
 *   basePath: '/project/.claude/memory',
 *   ids: ['learning-api-design', 'gotcha-rate-limiting'],
 * });
 *
 * console.log(`Updated ${result.updated} files: ${result.updatedIds.join(', ')}`);
 * ```
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
  const idsToProcess = ids ?? (await getAllMemoryIds(basePath));

  for (const id of idsToProcess) {
    try {
      // Find file
      const filePath = await findMemoryFile(basePath, id);
      if (!filePath) {
        // File doesn't exist, skip silently
        continue;
      }

      // Get outbound links from graph
      const outboundEdges = getOutboundEdges(graph, id);
      const graphLinks = outboundEdges.map(e => e.target) as MemoryId[];

      // Read current file
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = parseMemoryFile(content);
      // Note: parseMemoryFile throws on invalid input, no null check needed

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
