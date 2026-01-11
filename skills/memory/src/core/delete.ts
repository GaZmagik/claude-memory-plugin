/**
 * T032: Memory Delete Operation
 *
 * Delete memory files and clean up index.
 */

import * as path from 'node:path';
import type { DeleteMemoryRequest, DeleteMemoryResponse } from '../types/api.js';
import { findInIndex, removeFromIndex } from './index.js';
import { deleteFile, fileExists } from './fs-utils.js';
import { createLogger } from './logger.js';

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

    // Check if file exists
    if (!fileExists(filePath)) {
      return {
        status: 'error',
        error: `Memory not found: ${request.id}`,
      };
    }

    // Delete the file
    deleteFile(filePath);

    // Remove from index
    await removeFromIndex(basePath, request.id);

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
