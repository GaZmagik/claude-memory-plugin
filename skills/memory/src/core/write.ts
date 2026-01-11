/**
 * T028: Memory Write Operation
 *
 * Create or update memory files.
 */

import * as path from 'node:path';
import type { WriteMemoryRequest, WriteMemoryResponse } from '../types/api.js';
import type { IndexEntry } from '../types/memory.js';
import { Scope } from '../types/enums.js';
import { generateUniqueId } from './slug.js';
import { createFrontmatter, serialiseMemoryFile } from './frontmatter.js';
import { writeFileAtomic, ensureDir } from './fs-utils.js';
import { addToIndex } from './index.js';
import { validateWriteRequest } from './validation.js';
import { createLogger } from './logger.js';
import { ensureLocalScopeGitignored } from '../scope/gitignore.js';

const log = createLogger('write');

/**
 * Write a memory to disk
 */
export async function writeMemory(request: WriteMemoryRequest): Promise<WriteMemoryResponse> {
  // Validate request
  const validation = validateWriteRequest(request);
  if (!validation.valid) {
    const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
    return {
      status: 'error',
      error: errorMessages,
    };
  }

  const basePath = request.basePath ?? process.cwd();

  try {
    // Ensure directory exists
    ensureDir(basePath);

    // Handle gitignore automation for local scope
    if (request.scope === Scope.Local && request.projectRoot) {
      ensureLocalScopeGitignored(request.projectRoot);
    }

    // Generate unique ID
    const id = generateUniqueId(request.type, request.title, basePath);

    // Create frontmatter with scope
    const frontmatter = createFrontmatter({
      type: request.type,
      title: request.title,
      tags: request.tags,
      scope: request.scope,
      severity: request.severity,
      links: request.links,
      source: request.source,
      meta: request.meta,
    });

    // Serialise to file content
    const fileContent = serialiseMemoryFile(frontmatter, request.content);

    // Write file
    const filePath = path.join(basePath, `${id}.md`);
    writeFileAtomic(filePath, fileContent);

    // Update index
    const indexEntry: IndexEntry = {
      id,
      type: request.type,
      title: request.title,
      tags: request.tags,
      created: frontmatter.created,
      updated: frontmatter.updated,
      scope: request.scope,
      relativePath: `${id}.md`,
      severity: request.severity,
    };

    await addToIndex(basePath, indexEntry);

    log.info('Wrote memory', { id, path: filePath });

    return {
      status: 'success',
      memory: {
        id,
        filePath,
        frontmatter,
        scope: request.scope,
      },
    };
  } catch (error) {
    log.error('Failed to write memory', { error: String(error) });
    return {
      status: 'error',
      error: `Failed to write memory: ${String(error)}`,
    };
  }
}
