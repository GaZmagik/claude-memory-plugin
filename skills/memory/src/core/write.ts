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
import { findSimilarToMemory } from '../search/semantic.js';
import { linkMemories } from '../graph/link.js';
import { loadGraph, saveGraph, addNode, hasNode } from '../graph/structure.js';

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

const AUTO_LINK_RELATION = 'auto-linked-by-similarity';

/**
 * Perform auto-linking for a newly written memory
 * @returns Number of links created
 */
async function performAutoLink(
  memoryId: string,
  basePath: string,
  threshold: number
): Promise<number> {
  try {
    // Find similar memories using embeddings cache
    // Note: provider param is unused in current implementation (reads from cache)
    const dummyProvider = { name: 'cache', generate: async () => [] };
    const similar = await findSimilarToMemory(
      memoryId,
      basePath,
      dummyProvider,
      threshold
    );

    if (similar.length === 0) {
      return 0;
    }

    // Create bidirectional links
    let linksCreated = 0;
    for (const match of similar) {
      const result = await linkMemories({
        source: memoryId,
        target: match.id,
        relation: AUTO_LINK_RELATION,
        basePath,
      });

      if (result.status === 'success' && !result.alreadyExists) {
        linksCreated++;
      }
    }

    return linksCreated;
  } catch (error) {
    // Auto-link failure shouldn't fail the write operation
    log.warn('Auto-link failed', { memoryId, error: String(error) });
    return 0;
  }
}

/**
 * Write a memory to disk
 */
export async function writeMemory(request: WriteMemoryRequest): Promise<WriteMemoryResponse> {
  // Validate request
  const validation = validateWriteRequest(request);
  if (!validation.valid) {
    const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
    log.error('Validation failed', { errors: errorMessages });
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

    // Use provided ID or generate unique ID
    const id = request.id ?? generateUniqueId(request.type, request.title, basePath);

    // Merge user tags with auto-generated scope tag
    const tags = mergeTagsWithScope(request.tags, request.scope);

    // Create frontmatter with id, scope, and project
    const frontmatter = createFrontmatter({
      id,
      type: request.type,
      title: request.title,
      tags,
      scope: request.scope,
      project: request.project,
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

    // Add node to graph if not present
    try {
      let graph = await loadGraph(basePath);
      if (!hasNode(graph, id)) {
        graph = addNode(graph, { id, type: request.type });
        await saveGraph(basePath, graph);
      }
    } catch {
      // Graph update is best-effort - sync.ts can fix later
      log.warn('Failed to add graph node', { id });
    }

    log.info('Wrote memory', { id, path: filePath });

    // Auto-link if requested
    let autoLinked: number | undefined;
    if (request.autoLink) {
      autoLinked = await performAutoLink(
        id,
        basePath,
        request.autoLinkThreshold ?? 0.85
      );
      if (autoLinked > 0) {
        log.info('Auto-linked memories', { id, count: autoLinked });
      }
    }

    return {
      status: 'success',
      memory: {
        id,
        filePath,
        frontmatter,
        scope: request.scope,
      },
      autoLinked,
    };
  } catch (error) {
    log.error('Failed to write memory', { error: String(error) });
    return {
      status: 'error',
      error: `Failed to write memory: ${String(error)}`,
    };
  }
}
