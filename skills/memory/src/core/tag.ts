/**
 * Tag Operations
 *
 * Add and remove tags from existing memories.
 */

import type {
  TagMemoryRequest,
  TagMemoryResponse,
  UntagMemoryRequest,
  UntagMemoryResponse,
} from '../types/api.js';
import { readMemory } from './read.js';
import { updateFrontmatter, serialiseMemoryFile } from './frontmatter.js';
import { addToIndex, findInIndex } from './index.js';
import { writeFileAtomic } from './fs-utils.js';
import { createLogger } from './logger.js';

const log = createLogger('tag');

/**
 * Add tags to an existing memory
 */
export async function tagMemory(request: TagMemoryRequest): Promise<TagMemoryResponse> {
  // Validate request
  if (!request.id || request.id.trim().length === 0) {
    return {
      status: 'error',
      error: 'id is required',
    };
  }

  if (!request.tags || request.tags.length === 0) {
    return {
      status: 'error',
      error: 'tags are required',
    };
  }

  const basePath = request.basePath ?? process.cwd();

  try {
    // Read existing memory
    const readResult = await readMemory({
      id: request.id,
      basePath,
      scope: request.scope,
    });

    if (readResult.status === 'error' || !readResult.memory) {
      return {
        status: 'error',
        error: readResult.error ?? `Memory not found: ${request.id}`,
      };
    }

    const { frontmatter, content, filePath } = readResult.memory;
    const previousTags = [...frontmatter.tags];

    // Merge tags (no duplicates)
    const newTags = [...new Set([...frontmatter.tags, ...request.tags])];

    // Update frontmatter
    const updatedFrontmatter = updateFrontmatter(frontmatter, { tags: newTags });

    // Write back
    const fileContent = serialiseMemoryFile(updatedFrontmatter, content);
    writeFileAtomic(filePath, fileContent);

    // Update index
    const indexEntry = await findInIndex(basePath, request.id);
    if (indexEntry) {
      indexEntry.tags = newTags;
      indexEntry.updated = updatedFrontmatter.updated;
      await addToIndex(basePath, indexEntry);
    }

    log.info('Added tags to memory', { id: request.id, added: request.tags });

    return {
      status: 'success',
      id: request.id,
      previousTags,
      newTags,
    };
  } catch (error) {
    log.error('Failed to tag memory', { id: request.id, error: String(error) });
    return {
      status: 'error',
      error: `Failed to tag memory: ${String(error)}`,
    };
  }
}

/**
 * Remove tags from an existing memory
 */
export async function untagMemory(request: UntagMemoryRequest): Promise<UntagMemoryResponse> {
  // Validate request
  if (!request.id || request.id.trim().length === 0) {
    return {
      status: 'error',
      error: 'id is required',
    };
  }

  if (!request.tags || request.tags.length === 0) {
    return {
      status: 'error',
      error: 'tags are required',
    };
  }

  const basePath = request.basePath ?? process.cwd();

  try {
    // Read existing memory
    const readResult = await readMemory({
      id: request.id,
      basePath,
      scope: request.scope,
    });

    if (readResult.status === 'error' || !readResult.memory) {
      return {
        status: 'error',
        error: readResult.error ?? `Memory not found: ${request.id}`,
      };
    }

    const { frontmatter, content, filePath } = readResult.memory;
    const previousTags = [...frontmatter.tags];

    // Find which tags exist and which don't
    const tagsToRemove = new Set(request.tags);
    const notFound = request.tags.filter(tag => !frontmatter.tags.includes(tag));
    const newTags = frontmatter.tags.filter(tag => !tagsToRemove.has(tag));

    // Update frontmatter
    const updatedFrontmatter = updateFrontmatter(frontmatter, { tags: newTags });

    // Write back
    const fileContent = serialiseMemoryFile(updatedFrontmatter, content);
    writeFileAtomic(filePath, fileContent);

    // Update index
    const indexEntry = await findInIndex(basePath, request.id);
    if (indexEntry) {
      indexEntry.tags = newTags;
      indexEntry.updated = updatedFrontmatter.updated;
      await addToIndex(basePath, indexEntry);
    }

    log.info('Removed tags from memory', { id: request.id, removed: request.tags });

    return {
      status: 'success',
      id: request.id,
      previousTags,
      newTags,
      notFound: notFound.length > 0 ? notFound : undefined,
    };
  } catch (error) {
    log.error('Failed to untag memory', { id: request.id, error: String(error) });
    return {
      status: 'error',
      error: `Failed to untag memory: ${String(error)}`,
    };
  }
}
