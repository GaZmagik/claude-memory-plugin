/**
 * Rename - Rename a memory ID and update all references
 *
 * Updates:
 * - Filename on disk
 * - Graph node ID
 * - All edge references (source/target)
 * - Index entry
 * - Frontmatter ID (if stored in meta)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseMemoryFile,
  serialiseMemoryFile,
  updateFrontmatter,
} from '../core/frontmatter.js';
import { isInsideDir } from '../core/fs-utils.js';
import { loadIndex, saveIndex } from '../core/index.js';
import { loadGraph, saveGraph, type MemoryGraph } from '../graph/structure.js';
import { unsafeAsMemoryId } from '../types/branded.js';
import type { EmbeddingCache } from '../search/embedding.js';
import { MemoryType } from '../types/enums.js';

/**
 * Rename request options
 */
export interface RenameRequest {
  /** Current memory ID */
  oldId: string;
  /** New memory ID */
  newId: string;
  /** Base path for memory storage */
  basePath: string;
}

/**
 * Rename response
 */
export interface RenameResponse {
  status: 'success' | 'error';
  oldId: string;
  newId: string;
  /** File path after rename */
  newPath?: string;
  /** Changes made */
  changes: {
    fileRenamed: boolean;
    graphNodeUpdated: boolean;
    edgesUpdated: number;
    indexUpdated: boolean;
    embeddingsUpdated: boolean;
  };
  error?: string;
}

/**
 * Find a memory file by ID
 */
function findMemoryFile(basePath: string, id: string): string | null {
  const permanentPath = path.join(basePath, 'permanent', `${id}.md`);
  if (fs.existsSync(permanentPath)) {
    return permanentPath;
  }

  const temporaryPath = path.join(basePath, 'temporary', `${id}.md`);
  if (fs.existsSync(temporaryPath)) {
    return temporaryPath;
  }

  return null;
}

/**
 * Renames a memory's ID and updates all references across the system.
 *
 * This function performs a comprehensive rename operation that updates:
 * - The filename on disk
 * - The graph node ID
 * - All edge references (source and target)
 * - The index entry
 * - The frontmatter ID (if stored in meta)
 * - The embeddings cache key
 *
 * The file remains in its current directory (permanent/ or temporary/).
 * Path traversal attempts are rejected for security.
 *
 * @param request - The rename request options
 * @param request.oldId - The current memory ID
 * @param request.newId - The new memory ID
 * @param request.basePath - The base path for memory storage
 * @returns A promise resolving to a RenameResponse indicating success or failure,
 *          including details of all updates made (file, graph, edges, index, embeddings)
 * @throws Never throws directly; errors are captured in the response object
 *
 * @example
 * ```typescript
 * import { renameMemory } from './maintenance/rename.js';
 *
 * // Rename a memory to fix a typo
 * const result = await renameMemory({
 *   oldId: 'learning-typescirpt-generics',
 *   newId: 'learning-typescript-generics',
 *   basePath: '/project/.claude/memory',
 * });
 *
 * if (result.status === 'success') {
 *   console.log(`Renamed to: ${result.newPath}`);
 *   console.log(`Edges updated: ${result.changes.edgesUpdated}`);
 * } else {
 *   console.error(`Rename failed: ${result.error}`);
 * }
 * ```
 */
export async function renameMemory(request: RenameRequest): Promise<RenameResponse> {
  const { oldId, newId, basePath } = request;

  const changes = {
    fileRenamed: false,
    graphNodeUpdated: false,
    edgesUpdated: 0,
    indexUpdated: false,
    embeddingsUpdated: false,
  };

  // Find the source file
  const oldPath = findMemoryFile(basePath, oldId);
  if (!oldPath) {
    return {
      status: 'error',
      oldId,
      newId,
      changes,
      error: `Memory not found: ${oldId}`,
    };
  }

  // SECURITY: Check if node is read-only external node BEFORE any file operations (prevent TOCTOU)
  const graph = await loadGraph(basePath);
  const existingNode = graph.nodes.find((n: any) => n.id === oldId);
  if (existingNode && (existingNode.type === MemoryType.Rule || existingNode.type === MemoryType.Reminder)) {
    return {
      status: 'error',
      oldId,
      newId,
      changes,
      error: `'${oldId}' is a read-only external node (${existingNode.type}). Run 'memory sync' to refresh it.`,
    };
  }

  // Determine new path (same directory)
  const dir = path.dirname(oldPath);
  const newPath = path.join(dir, `${newId}.md`);

  // Validate new path stays within basePath (prevent path traversal)
  if (!isInsideDir(basePath, newPath)) {
    return {
      status: 'error',
      oldId,
      newId,
      changes,
      error: 'Invalid new ID: path traversal not allowed',
    };
  }

  // Check if target already exists
  if (fs.existsSync(newPath)) {
    return {
      status: 'error',
      oldId,
      newId,
      changes,
      error: `Target already exists: ${newId}`,
    };
  }

  // Read and update file content
  const content = fs.readFileSync(oldPath, 'utf8');
  const parsed = parseMemoryFile(content);
  // Note: parseMemoryFile throws on invalid input, no null check needed

  // Update frontmatter if it contains ID in meta
  const updatedMeta = { ...(parsed.frontmatter.meta ?? {}) };
  if (updatedMeta.id === oldId) {
    updatedMeta.id = newId;
  }

  const updatedFm = updateFrontmatter(parsed.frontmatter, {
    meta: Object.keys(updatedMeta).length > 0 ? updatedMeta : undefined,
  });

  // Write to new path and delete old
  const newContent = serialiseMemoryFile(updatedFm, parsed.content);
  fs.writeFileSync(newPath, newContent, 'utf8');
  fs.unlinkSync(oldPath);
  changes.fileRenamed = true;

  // Update graph (already loaded earlier for security check)
  // Update node ID
  const nodeIndex = graph.nodes.findIndex(n => n.id === oldId);
  if (nodeIndex >= 0) {
    const existingNode = graph.nodes[nodeIndex];
    if (existingNode) {
      graph.nodes[nodeIndex] = { ...existingNode, id: newId };
      changes.graphNodeUpdated = true;
    }
  }

  // Update edge references
  const updatedGraph: MemoryGraph = {
    ...graph,
    edges: graph.edges.map(edge => {
      let updated = false;
      const newEdge = { ...edge };

      if (edge.source === oldId) {
        newEdge.source = newId;
        updated = true;
      }
      if (edge.target === oldId) {
        newEdge.target = newId;
        updated = true;
      }

      if (updated) {
        changes.edgesUpdated++;
      }
      return newEdge;
    }),
  };

  await saveGraph(basePath, updatedGraph);

  // Update index
  const index = await loadIndex({ basePath });
  const entryIndex = index.memories.findIndex(e => e.id === oldId);
  if (entryIndex >= 0) {
    const existingEntry = index.memories[entryIndex];
    if (existingEntry) {
      index.memories[entryIndex] = {
        ...existingEntry,
        id: unsafeAsMemoryId(newId),
        relativePath: existingEntry.relativePath.replace(oldId, newId),
      };
      await saveIndex(basePath, index);
      changes.indexUpdated = true;
    }
  }

  // Update embeddings cache key
  try {
    const embeddingsPath = path.join(basePath, 'embeddings.json');
    if (fs.existsSync(embeddingsPath)) {
      const content = fs.readFileSync(embeddingsPath, 'utf-8');
      const cache = JSON.parse(content) as EmbeddingCache;
      if (cache.memories && cache.memories[oldId]) {
        // Move embedding to new key
        cache.memories[newId] = cache.memories[oldId];
        delete cache.memories[oldId];
        fs.writeFileSync(embeddingsPath, JSON.stringify(cache, null, 2));
        changes.embeddingsUpdated = true;
      }
    }
  } catch {
    // Embeddings update is best-effort
  }

  return {
    status: 'success',
    oldId,
    newId,
    newPath,
    changes,
  };
}
