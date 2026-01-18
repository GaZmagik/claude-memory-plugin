/**
 * T029: Memory Read Operation
 *
 * Read memory files by ID.
 */

import * as path from 'node:path';
import type { ReadMemoryRequest, ReadMemoryResponse } from '../types/api.js';
import { findInIndex } from './index.js';
import { readFile, fileExists, isInsideDir } from './fs-utils.js';
import { parseMemoryFile } from './frontmatter.js';
import { createLogger } from './logger.js';

const log = createLogger('read');

/**
 * Read a memory by ID
 */
export async function readMemory(request: ReadMemoryRequest): Promise<ReadMemoryResponse> {
  // Validate ID
  if (!request.id || request.id.trim().length === 0) {
    return {
      status: 'error',
      error: 'id is required',
    };
  }

  const basePath = request.basePath ?? process.cwd();

  try {
    // Try to find in index first
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

    if (!(await fileExists(filePath))) {
      return {
        status: 'error',
        error: `Memory not found: ${request.id}`,
      };
    }

    // Read and parse file
    const fileContent = await readFile(filePath);
    const { frontmatter, content } = parseMemoryFile(fileContent);

    log.debug('Read memory', { id: request.id, path: filePath });

    return {
      status: 'success',
      memory: {
        frontmatter,
        content,
        filePath,
      },
    };
  } catch (error) {
    log.error('Failed to read memory', { id: request.id, error: String(error) });
    return {
      status: 'error',
      error: `Failed to read memory: ${String(error)}`,
    };
  }
}
