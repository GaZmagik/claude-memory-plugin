/**
 * Refresh Frontmatter - Backfill missing fields and migrate legacy data
 *
 * Updates memory files to include:
 * - id: Memory ID (from filename)
 * - project: Project name (from git repo or directory)
 *
 * Also migrates legacy data:
 * - embedding hash from frontmatter → embeddings.json (if not already there)
 * - Removes legacy embedding field from frontmatter
 * - Renames think-* files to thought-* (ID prefix migration)
 * - Updates thought.json, graph.json, index.json with new IDs
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseMemoryFile,
  serialiseMemoryFile,
  updateFrontmatter,
} from '../../core/frontmatter.js';
import { getAllMemoryIds, findMemoryFile } from '../../core/fs-utils.js';
import { migrateThinkId, migrateThoughtJsonState, migrateGraphJson, migrateIndexJson } from './think-migration.js';
import { detectProjectName } from './project-detection.js';
import { loadEmbeddingsCache, saveEmbeddingsCache } from './embeddings.js';
import type { RefreshFrontmatterRequest, RefreshFrontmatterResponse } from './types.js';

export type { RefreshFrontmatterRequest, RefreshFrontmatterResponse } from './types.js';

/**
 * Backfills missing frontmatter fields and migrates legacy data in memory files.
 *
 * This function performs several maintenance tasks:
 *
 * 1. **ID backfill**: Adds `id` field from filename if missing
 * 2. **Project backfill**: Adds `project` field (auto-detected from git or directory)
 * 3. **Title extraction**: Extracts title from first markdown heading if missing
 * 4. **Embedding migration**: Moves legacy `embedding` hash from frontmatter to embeddings.json
 * 5. **Think-to-thought migration**: Renames `think-*` files to `thought-*` prefix
 * 6. **Graph type sync**: Updates graph node types to match frontmatter
 *
 * The function uses lenient parsing to handle and fix malformed frontmatter.
 *
 * @param request - The refresh frontmatter request options
 * @param request.basePath - The base path for memory storage
 * @param request.dryRun - If true, reports changes without applying them
 * @param request.ids - Optional array of specific IDs to refresh; if omitted, refreshes all
 * @param request.project - Optional project name; auto-detected from git remote or directory if omitted
 * @returns A promise resolving to a RefreshFrontmatterResponse with counts of
 *          updated files, migrations performed, and the project name used
 * @throws Never throws directly; errors are captured in the response object
 *
 * @example
 * ```typescript
 * import { refreshFrontmatter } from './maintenance/refresh-frontmatter/index.js';
 *
 * // Preview what would be updated
 * const preview = await refreshFrontmatter({
 *   basePath: '/project/.claude/memory',
 *   dryRun: true,
 * });
 *
 * console.log(`Would update ${preview.wouldUpdate?.length ?? 0} files`);
 * console.log(`Would migrate ${preview.thinkToThoughtMigrated} think->thought IDs`);
 * console.log(`Detected project: ${preview.project}`);
 *
 * // Apply refresh with explicit project name
 * const result = await refreshFrontmatter({
 *   basePath: '/project/.claude/memory',
 *   project: 'my-custom-project',
 * });
 *
 * console.log(`Updated ${result.updated} files`);
 * console.log(`Migrated ${result.embeddingsMigrated} embeddings`);
 * console.log(`Updated ${result.graphTypesUpdated} graph node types`);
 * ```
 */
export async function refreshFrontmatter(
  request: RefreshFrontmatterRequest
): Promise<RefreshFrontmatterResponse> {
  const { basePath, dryRun = false, ids } = request;

  const errors: string[] = [];
  const updatedIds: string[] = [];
  const wouldUpdate: string[] = [];
  let skipped = 0;
  let embeddingsMigrated = 0;
  let thinkToThoughtMigrated = 0;
  let graphTypesUpdated = 0;

  // Detect project name if not provided
  const project = request.project ?? detectProjectName(basePath);

  // Load embeddings cache (for migration)
  let embeddingsCache = loadEmbeddingsCache(basePath);
  let embeddingsCacheModified = false;

  // Get IDs to process
  const idsToProcess = ids ?? (await getAllMemoryIds(basePath));

  for (const id of idsToProcess) {
    try {
      // Find file
      let filePath = await findMemoryFile(basePath, id);
      if (!filePath) {
        continue;
      }

      // Check for think→thought migration
      let currentId = id;
      if (id.startsWith('think-')) {
        const newId = migrateThinkId(id);
        const newFilePath = filePath.replace(`${id}.md`, `${newId}.md`);

        if (!dryRun) {
          // Rename file
          fs.renameSync(filePath, newFilePath);
          filePath = newFilePath;

          // Update JSON files
          migrateThoughtJsonState(basePath, id, newId, dryRun);
          migrateGraphJson(basePath, id, newId, dryRun);
          migrateIndexJson(basePath, id, newId, dryRun);
        }

        currentId = newId;
        thinkToThoughtMigrated++;
      }

      // Read current file (lenient mode to allow fixing malformed files)
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = parseMemoryFile(content, { lenient: true });
      // Note: parseMemoryFile throws on invalid format, no null check needed

      const fm = parsed.frontmatter;
      let needsUpdate = false;

      // Check if id needs adding or updating (use currentId which may have been migrated)
      if (!fm.id || fm.id !== currentId) {
        needsUpdate = true;
      }

      // Check if project needs adding (only for project-scoped memories)
      if (project && !fm.project) {
        needsUpdate = true;
      }

      // Check if title needs extracting from content heading
      if (!fm.title && parsed.content) {
        needsUpdate = true;
      }

      // Check for legacy embedding field to migrate
      const legacyEmbedding = (fm as unknown as Record<string, unknown>).embedding as string | undefined;
      if (legacyEmbedding && typeof legacyEmbedding === 'string') {
        needsUpdate = true;

        // Migrate to embeddings.json if not already there
        // Note: The legacy embedding is just a hash, not the actual vector
        // We can store it as a placeholder that needs regeneration
        if (!embeddingsCache.memories[id]) {
          embeddingsCache.memories[id] = {
            embedding: [], // Empty - needs regeneration via suggest-links
            hash: legacyEmbedding,
            timestamp: new Date().toISOString(),
          };
          embeddingsCacheModified = true;
          embeddingsMigrated++;
        }
      }

      if (!needsUpdate) {
        skipped++;
        continue;
      }

      // Build updates
      const updates: Record<string, unknown> = {};
      if (!fm.id || fm.id !== currentId) {
        updates.id = currentId;
      }
      if (project && !fm.project) {
        updates.project = project;
      }
      // Extract title from first markdown heading if missing
      if (!fm.title && parsed.content) {
        const headingMatch = parsed.content.match(/^#\s+(.+?)$/m);
        if (headingMatch && headingMatch[1]) {
          updates.title = headingMatch[1].trim();
        }
      }

      if (dryRun) {
        wouldUpdate.push(currentId);
      } else {
        // Update frontmatter
        const updatedFm = updateFrontmatter(fm, updates);

        // Remove legacy embedding field if present
        if (legacyEmbedding) {
          delete (updatedFm as unknown as Record<string, unknown>).embedding;
        }

        // Serialise and write
        const newContent = serialiseMemoryFile(updatedFm, parsed.content);
        fs.writeFileSync(filePath, newContent, 'utf8');
        updatedIds.push(currentId);
      }
    } catch (err) {
      errors.push(`${id}: ${err}`);
    }
  }

  // Save embeddings cache if modified
  if (embeddingsCacheModified && !dryRun) {
    saveEmbeddingsCache(basePath, embeddingsCache);
  }

  // Sync types from frontmatter to graph
  if (!dryRun) {
    const graphPath = path.join(basePath, 'graph.json');
    if (fs.existsSync(graphPath)) {
      try {
        const graphContent = fs.readFileSync(graphPath, 'utf-8');
        const graph = JSON.parse(graphContent);
        let graphModified = false;

        for (const id of idsToProcess) {
          const filePath = await findMemoryFile(basePath, id);
          if (!filePath) continue;

          const content = fs.readFileSync(filePath, 'utf8');
          const parsed = parseMemoryFile(content);
          // Note: parseMemoryFile throws on invalid input, type always present

          const nodeIndex = graph.nodes?.findIndex((n: { id: string }) => n.id === id);
          if (nodeIndex >= 0 && graph.nodes[nodeIndex].type !== parsed.frontmatter.type) {
            graph.nodes[nodeIndex].type = parsed.frontmatter.type;
            graphModified = true;
            graphTypesUpdated++;
          }
        }

        if (graphModified) {
          fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2));
        }
      } catch {
        // Graph sync failed, not critical
      }
    }
  }

  return {
    status: errors.length > 0 ? 'error' : 'success',
    updated: updatedIds.length,
    updatedIds,
    ...(dryRun && { wouldUpdate }),
    skipped,
    embeddingsMigrated,
    thinkToThoughtMigrated,
    graphTypesUpdated,
    project,
    ...(errors.length > 0 && { errors }),
  };
}
