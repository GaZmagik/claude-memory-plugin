/**
 * T032: Memory Delete Operation
 *
 * Delete memory files and clean up index, graph, and embeddings.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DeleteMemoryRequest, DeleteMemoryResponse } from '../types/api.js';
import { findInIndex, removeFromIndex } from './index.js';
import { deleteFile, fileExists, isInsideDir } from './fs-utils.js';
import { createLogger } from './logger.js';
import { loadGraph, saveGraph, removeNode } from '../graph/structure.js';
import type { EmbeddingCache } from '../search/embedding.js';

const log = createLogger('delete');

/**
 * Delete a memory by ID
 */
export async function deleteMemory(request: DeleteMemoryRequest): Promise<DeleteMemoryResponse> {
  // Validate ID
  if (!request.id || request.id.trim().length === 0) {
    return {
      status: 'error',
      error: 'id is required',
    };
  }

  const basePath = request.basePath ?? process.cwd();

  try {
    // Find in index first
    const indexEntry = await findInIndex(basePath, request.id);

    let filePath: string;

    if (indexEntry) {
      filePath = path.join(basePath, indexEntry.relativePath);
    } else {
      // Fall back to direct file lookup
      filePath = path.join(basePath, `${request.id}.md`);
    }

    // Security: Validate path stays within basePath (prevent path traversal)
    if (!isInsideDir(basePath, filePath)) {
      log.warn('Path traversal attempt detected', { id: request.id, filePath });
      return {
        status: 'error',
        error: 'Invalid memory ID: path traversal not allowed',
      };
    }

    // Check if file exists
    if (!(await fileExists(filePath))) {
      return {
        status: 'error',
        error: `Memory not found: ${request.id}`,
      };
    }

    // Delete the file
    await deleteFile(filePath);

    // Remove from index
    await removeFromIndex(basePath, request.id);

    // Remove from graph (node and all edges involving it)
    try {
      let graph = await loadGraph(basePath);
      graph = removeNode(graph, request.id);
      await saveGraph(basePath, graph);
    } catch {
      // Graph cleanup is best-effort - sync.ts can fix orphans later
      log.warn('Failed to clean up graph node', { id: request.id });
    }

    // Remove from embeddings cache
    try {
      const embeddingsPath = path.join(basePath, 'embeddings.json');
      if (fs.existsSync(embeddingsPath)) {
        const content = fs.readFileSync(embeddingsPath, 'utf-8');
        const cache = JSON.parse(content) as EmbeddingCache;
        if (cache.memories && cache.memories[request.id]) {
          delete cache.memories[request.id];
          fs.writeFileSync(embeddingsPath, JSON.stringify(cache, null, 2));
        }
      }
    } catch {
      // Embeddings cleanup is best-effort
      log.warn('Failed to clean up embedding', { id: request.id });
    }

    log.info('Deleted memory', { id: request.id, path: filePath });

    return {
      status: 'success',
      deletedId: request.id,
    };
  } catch (error) {
    log.error('Failed to delete memory', { id: request.id, error: String(error) });
    return {
      status: 'error',
      error: `Failed to delete memory: ${String(error)}`,
    };
  }
}
