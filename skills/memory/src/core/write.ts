/**
 * T028: Memory Write Operation
 *
 * Create or update memory files.
 */

import * as path from 'node:path';
import type { WriteMemoryRequest, WriteMemoryResponse } from '../types/api.js';
import type { IndexEntry } from '../types/memory.js';
import { MemoryType, Scope } from '../types/enums.js';
import { generateUniqueId } from './slug.js';
import { createFrontmatter, serialiseMemoryFile } from './frontmatter.js';
import { writeFileAtomic, ensureDir } from './fs-utils.js';
import { addToIndex } from './index.js';
import { validateWriteRequest } from './validation.js';
import { createLogger } from './logger.js';
import { ensureLocalScopeGitignored } from '../scope/gitignore.js';

const log = createLogger('write');

/**
 * Get the scope tag for a given scope
 */
function getScopeTag(scope: Scope): string {
  switch (scope) {
    case Scope.Enterprise:
      return 'enterprise';
    case Scope.Local:
      return 'local';
    case Scope.Project:
      return 'project';
    case Scope.Global:
      return 'user';
  }
}

/**
 * Merge user tags with auto-generated scope tag (no duplicates)
 */
function mergeTagsWithScope(userTags: string[] | undefined, scope: Scope): string[] {
  const scopeTag = getScopeTag(scope);
  const tags = userTags ? [...userTags] : [];
  if (!tags.includes(scopeTag)) {
    tags.push(scopeTag);
  }
  return tags;
}

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

    // Merge user tags with auto-generated scope tag
    const tags = mergeTagsWithScope(request.tags, request.scope);

    // Create frontmatter with scope
    const frontmatter = createFrontmatter({
      type: request.type,
      title: request.title,
      tags,
      scope: request.scope,
      severity: request.severity,
      links: request.links,
      source: request.source,
      meta: request.meta,
    });

    // Serialise to file content
    const fileContent = serialiseMemoryFile(frontmatter, request.content);

    // Determine subdirectory based on memory type
    // Breadcrumb = temporary, everything else = permanent
    const subdir = request.type === MemoryType.Breadcrumb ? 'temporary' : 'permanent';
    const memoryDir = path.join(basePath, subdir);
    ensureDir(memoryDir);

    // Write file
    const filePath = path.join(memoryDir, `${id}.md`);
    writeFileAtomic(filePath, fileContent);

    // Update index
    const relativePath = path.join(subdir, `${id}.md`);
    const indexEntry: IndexEntry = {
      id,
      type: request.type,
      title: request.title,
      tags,
      created: frontmatter.created,
      updated: frontmatter.updated,
      scope: request.scope,
      relativePath,
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
