/**
 * Archive - Archive a memory
 *
 * Archives a memory by:
 * - Moving it to an archive/ subdirectory
 * - Removing it from the active graph and index
 * - Preserving the file for historical reference
 *
 * Archived memories are not searchable but can be restored.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { removeFromIndex } from '../core/index.js';
import { loadGraph, saveGraph, removeNode } from '../graph/structure.js';
import type { EmbeddingCache } from '../search/embedding.js';

/**
 * Archive request options
 */
export interface ArchiveRequest {
  /** Memory ID to archive */
  id: string;
  /** Base path for memory storage */
  basePath: string;
}

/**
 * Archive response
 */
export interface ArchiveResponse {
  status: 'success' | 'error';
  id: string;
  /** Original path */
  sourcePath?: string;
  /** Archive path */
  archivePath?: string;
  /** Changes made */
  changes: {
    fileMoved: boolean;
    removedFromGraph: boolean;
    removedFromIndex: boolean;
    removedFromEmbeddings: boolean;
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
 * Archives a memory by moving it to an archive directory and removing it from
 * the active graph, index, and embeddings cache.
 *
 * Archived memories are preserved on disk for historical reference but are no
 * longer searchable or included in graph traversals. The file is moved from
 * its current location (permanent/ or temporary/) to archive/.
 *
 * @param request - The archive request options
 * @param request.id - The unique identifier of the memory to archive
 * @param request.basePath - The base path for memory storage (e.g., `.claude/memory`)
 * @returns A promise resolving to an ArchiveResponse indicating success or failure
 *          with details of changes made
 * @throws Never throws directly; errors are captured in the response object
 *
 * @example
 * ```typescript
 * import { archiveMemory } from './maintenance/archive.js';
 *
 * const result = await archiveMemory({
 *   id: 'learning-typescript-generics',
 *   basePath: '/project/.claude/memory',
 * });
 *
 * if (result.status === 'success') {
 *   console.log(`Archived to: ${result.archivePath}`);
 *   console.log(`Removed from graph: ${result.changes.removedFromGraph}`);
 * } else {
 *   console.error(`Archive failed: ${result.error}`);
 * }
 * ```
 */
export async function archiveMemory(request: ArchiveRequest): Promise<ArchiveResponse> {
  const { id, basePath } = request;

  const changes = {
    fileMoved: false,
    removedFromGraph: false,
    removedFromIndex: false,
    removedFromEmbeddings: false,
  };

  // Find the file
  const sourcePath = findMemoryFile(basePath, id);
  if (!sourcePath) {
    return {
      status: 'error',
      id,
      changes,
      error: `Memory not found: ${id}`,
    };
  }

  // Create archive directory
  const archiveDir = path.join(basePath, 'archive');
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  // Determine archive path
  const archivePath = path.join(archiveDir, `${id}.md`);

  // Check if already archived
  if (fs.existsSync(archivePath)) {
    return {
      status: 'error',
      id,
      sourcePath,
      changes,
      error: `Memory already archived: ${id}`,
    };
  }

  // Move file to archive
  fs.renameSync(sourcePath, archivePath);
  changes.fileMoved = true;

  // Remove from graph
  try {
    let graph = await loadGraph(basePath);
    graph = removeNode(graph, id);
    await saveGraph(basePath, graph);
    changes.removedFromGraph = true;
  } catch {
    // Graph may not exist or node not in graph
  }

  // Remove from index
  try {
    const removed = await removeFromIndex(basePath, id);
    changes.removedFromIndex = removed;
  } catch {
    // Index may not exist
  }

  // Remove from embeddings cache (archived memories shouldn't be searchable)
  try {
    const embeddingsPath = path.join(basePath, 'embeddings.json');
    if (fs.existsSync(embeddingsPath)) {
      const content = fs.readFileSync(embeddingsPath, 'utf-8');
      const cache = JSON.parse(content) as EmbeddingCache;
      if (cache.memories && cache.memories[id]) {
        delete cache.memories[id];
        fs.writeFileSync(embeddingsPath, JSON.stringify(cache, null, 2));
        changes.removedFromEmbeddings = true;
      }
    }
  } catch {
    // Embeddings cleanup is best-effort
  }

  return {
    status: 'success',
    id,
    sourcePath,
    archivePath,
    changes,
  };
}
