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
import { execFileSync } from 'node:child_process';
import {
  parseMemoryFile,
  serialiseMemoryFile,
  updateFrontmatter,
} from '../core/frontmatter.js';
import { getAllMemoryIds, findMemoryFile } from '../core/fs-utils.js';
import type { EmbeddingCache } from '../search/embedding.js';

/**
 * Refresh frontmatter request options
 */
export interface RefreshFrontmatterRequest {
  /** Base path for memory storage */
  basePath: string;
  /** Dry run - report changes without applying */
  dryRun?: boolean;
  /** Only refresh specific IDs (optional) */
  ids?: string[];
  /** Project name to use (optional - auto-detected if not provided) */
  project?: string;
}

/**
 * Refresh frontmatter response
 */
export interface RefreshFrontmatterResponse {
  status: 'success' | 'error';
  /** Number of files updated */
  updated: number;
  /** IDs of files updated */
  updatedIds: string[];
  /** Files that would be updated (dry run only) */
  wouldUpdate?: string[];
  /** Files skipped (no changes needed) */
  skipped: number;
  /** Number of embeddings migrated */
  embeddingsMigrated: number;
  /** Number of think→thought ID migrations */
  thinkToThoughtMigrated: number;
  /** Number of graph node types updated */
  graphTypesUpdated: number;
  /** Project name used */
  project?: string;
  /** Any errors encountered */
  errors?: string[];
}

/**
 * Migrate a think- prefixed ID to thought- prefix
 */
function migrateThinkId(id: string): string {
  if (id.startsWith('think-')) {
    return 'thought-' + id.slice(6);
  }
  return id;
}

/**
 * Update thought.json state file with migrated IDs
 */
function migrateThoughtJsonState(basePath: string, oldId: string, newId: string, dryRun: boolean): boolean {
  const statePath = path.join(basePath, 'thought.json');
  if (!fs.existsSync(statePath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    const state = JSON.parse(content);

    if (state.currentDocumentId === oldId) {
      if (!dryRun) {
        state.currentDocumentId = newId;
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      }
      return true;
    }
  } catch {
    // Ignore errors
  }
  return false;
}

/**
 * Update graph.json with migrated IDs
 */
function migrateGraphJson(basePath: string, oldId: string, newId: string, dryRun: boolean): boolean {
  const graphPath = path.join(basePath, 'graph.json');
  if (!fs.existsSync(graphPath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(graphPath, 'utf-8');
    if (!content.includes(`"${oldId}"`)) {
      return false;
    }

    if (!dryRun) {
      const updated = content.replace(new RegExp(`"${oldId}"`, 'g'), `"${newId}"`);
      fs.writeFileSync(graphPath, updated);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Update index.json with migrated IDs and paths
 */
function migrateIndexJson(basePath: string, oldId: string, newId: string, dryRun: boolean): boolean {
  const indexPath = path.join(basePath, 'index.json');
  if (!fs.existsSync(indexPath)) {
    return false;
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf-8');
    if (!content.includes(`"${oldId}"`)) {
      return false;
    }

    if (!dryRun) {
      // Replace ID and file paths
      let updated = content.replace(new RegExp(`"${oldId}"`, 'g'), `"${newId}"`);
      updated = updated.replace(
        new RegExp(`temporary/${oldId}\\.md`, 'g'),
        `temporary/${newId}.md`
      );
      fs.writeFileSync(indexPath, updated);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect project name from git repo or directory
 */
function detectProjectName(basePath: string): string | undefined {
  // Find the project root from .claude/memory path
  let projectRoot = basePath;
  if (basePath.includes('.claude/memory')) {
    projectRoot = basePath.split('.claude/memory')[0]!.replace(/\/$/, '');
  }

  // Try to get git repo name (using execFileSync for security)
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (remote) {
      // Extract repo name from URL
      const match = remote.match(/\/([^/]+?)(\.git)?$/);
      if (match) {
        return match[1];
      }
    }
  } catch {
    // Not a git repo or no remote
  }

  // Fall back to directory name
  try {
    return path.basename(projectRoot);
  } catch {
    return undefined;
  }
}

/**
 * Load or create embeddings cache
 */
function loadEmbeddingsCache(basePath: string): EmbeddingCache {
  const cachePath = path.join(basePath, 'embeddings.json');
  if (!fs.existsSync(cachePath)) {
    return { version: 1, memories: {} };
  }

  try {
    const content = fs.readFileSync(cachePath, 'utf-8');
    const cache = JSON.parse(content) as EmbeddingCache;
    // Ensure memories property exists
    if (!cache.memories) {
      cache.memories = {};
    }
    return cache;
  } catch {
    return { version: 1, memories: {} };
  }
}

/**
 * Save embeddings cache
 */
function saveEmbeddingsCache(basePath: string, cache: EmbeddingCache): void {
  const cachePath = path.join(basePath, 'embeddings.json');
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

/**
 * Refresh frontmatter for all memories
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
