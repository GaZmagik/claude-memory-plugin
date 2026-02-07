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
 * Add tags to an existing memory.
 *
 * Reads the memory, merges the new tags with existing ones (avoiding duplicates),
 * writes the updated file, and updates the index. The memory's `updated` timestamp
 * is automatically refreshed.
 *
 * @param request - Tag request containing the memory ID and tags to add
 * @param request.id - The ID of the memory to tag (required)
 * @param request.tags - Array of tags to add (required, must not be empty)
 * @param request.basePath - Base path for memory storage (defaults to cwd)
 * @param request.scope - Scope where memory is located (optional)
 *
 * @returns {Promise<TagMemoryResponse>} Response object containing:
 *   - `status`: 'success' or 'error'
 *   - `id`: The memory ID
 *   - `previousTags`: Array of tags before the operation
 *   - `newTags`: Array of tags after the operation
 *   - `error`: Error message if status is 'error'
 *
 * @throws Never throws directly; errors are returned in the response object
 *
 * @example
 * // Add tags to a memory
 * const result = await tagMemory({
 *   id: 'learning-typescript-generics-abc123',
 *   tags: ['advanced', 'type-system'],
 *   basePath: '/path/to/project/.claude/memory'
 * });
 * if (result.status === 'success') {
 *   console.log(`Previous tags: ${result.previousTags.join(', ')}`);
 *   console.log(`New tags: ${result.newTags.join(', ')}`);
 * }
 *
 * @example
 * // Add a single tag (duplicates are ignored)
 * const result = await tagMemory({
 *   id: 'gotcha-async-cleanup-def456',
 *   tags: ['critical'],
 *   basePath: '/path/to/project/.claude/memory'
 * });
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
 * Remove tags from an existing memory.
 *
 * Reads the memory, removes the specified tags from the existing tag list,
 * writes the updated file, and updates the index. The memory's `updated`
 * timestamp is automatically refreshed. Tags that do not exist are tracked
 * in the `notFound` field of the response.
 *
 * @param request - Untag request containing the memory ID and tags to remove
 * @param request.id - The ID of the memory to untag (required)
 * @param request.tags - Array of tags to remove (required, must not be empty)
 * @param request.basePath - Base path for memory storage (defaults to cwd)
 * @param request.scope - Scope where memory is located (optional)
 *
 * @returns {Promise<UntagMemoryResponse>} Response object containing:
 *   - `status`: 'success' or 'error'
 *   - `id`: The memory ID
 *   - `previousTags`: Array of tags before the operation
 *   - `newTags`: Array of tags after the operation
 *   - `notFound`: Array of tags that were not present (optional)
 *   - `error`: Error message if status is 'error'
 *
 * @throws Never throws directly; errors are returned in the response object
 *
 * @example
 * // Remove tags from a memory
 * const result = await untagMemory({
 *   id: 'learning-typescript-generics-abc123',
 *   tags: ['deprecated', 'outdated'],
 *   basePath: '/path/to/project/.claude/memory'
 * });
 * if (result.status === 'success') {
 *   console.log(`Removed tags, now: ${result.newTags.join(', ')}`);
 *   if (result.notFound) {
 *     console.log(`Tags not found: ${result.notFound.join(', ')}`);
 *   }
 * }
 *
 * @example
 * // Attempt to remove a non-existent tag (still succeeds)
 * const result = await untagMemory({
 *   id: 'decision-api-design-ghi789',
 *   tags: ['non-existent-tag'],
 *   basePath: '/path/to/project/.claude/memory'
 * });
 * // result.notFound will contain ['non-existent-tag']
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
