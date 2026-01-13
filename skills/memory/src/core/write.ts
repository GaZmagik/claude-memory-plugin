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
import { writeFileAtomic, ensureDir, fileExists } from './fs-utils.js';
import { addToIndex, loadIndex } from './index.js';
import { validateWriteRequest } from './validation.js';
import { createLogger } from './logger.js';
import { ensureLocalScopeGitignored } from '../scope/gitignore.js';
import { findSimilarToMemory } from '../search/semantic.js';
import { linkMemories } from '../graph/link.js';
import {
  generateEmbedding,
  loadEmbeddingCache,
  saveEmbeddingCache,
  generateContentHash,
  type EmbeddingProvider,
} from '../search/embedding.js';
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

/**
 * Check if a memory ID already exists in any scope
 * Returns the path where it was found, or null if not found
 */
function checkCrossScopeDuplicate(
  id: string,
  basePath: string,
  projectRoot?: string
): string | null {
  const homedir = process.env.HOME || process.env.USERPROFILE || '';

  // Paths to check for duplicates
  const pathsToCheck: string[] = [];

  // Add project scope path if in a project
  if (projectRoot) {
    pathsToCheck.push(path.join(projectRoot, '.claude', 'memory', 'permanent', `${id}.md`));
    pathsToCheck.push(path.join(projectRoot, '.claude', 'memory', 'temporary', `${id}.md`));
    // Local scope
    pathsToCheck.push(path.join(projectRoot, '.claude', 'memory', 'local', 'permanent', `${id}.md`));
    pathsToCheck.push(path.join(projectRoot, '.claude', 'memory', 'local', 'temporary', `${id}.md`));
  }

  // Add global/user scope path
  pathsToCheck.push(path.join(homedir, '.claude', 'memory', 'permanent', `${id}.md`));
  pathsToCheck.push(path.join(homedir, '.claude', 'memory', 'temporary', `${id}.md`));

  // Exclude the current basePath from checks (that's where we're writing)
  const currentPermanent = path.join(basePath, 'permanent', `${id}.md`);
  const currentTemporary = path.join(basePath, 'temporary', `${id}.md`);

  for (const checkPath of pathsToCheck) {
    if (checkPath !== currentPermanent && checkPath !== currentTemporary) {
      if (fileExists(checkPath)) {
        return checkPath;
      }
    }
  }

  return null;
}

/**
 * Find memories with similar titles (Levenshtein-based)
 * Returns matches with similarity > 0.7
 */
async function findSimilarTitles(
  title: string,
  basePath: string,
  excludeId?: string
): Promise<Array<{ id: string; title: string; similarity: number }>> {
  try {
    const index = await loadIndex({ basePath });
    const results: Array<{ id: string; title: string; similarity: number }> = [];

    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalisedTitle = normalise(title);

    for (const memory of index.memories) {
      if (memory.id === excludeId) continue;

      const normalisedMemoryTitle = normalise(memory.title);
      const similarity = calculateSimilarity(normalisedTitle, normalisedMemoryTitle);

      if (similarity > 0.7) {
        results.push({ id: memory.id, title: memory.title, similarity });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  } catch {
    // Index might not exist yet
    return [];
  }
}

/**
 * Calculate similarity ratio between two strings (simplified Jaccard)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  // Use trigram similarity for better fuzzy matching
  const trigramsA = new Set<string>();
  const trigramsB = new Set<string>();

  for (let i = 0; i <= a.length - 3; i++) trigramsA.add(a.slice(i, i + 3));
  for (let i = 0; i <= b.length - 3; i++) trigramsB.add(b.slice(i, i + 3));

  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

  let intersection = 0;
  for (const t of trigramsA) if (trigramsB.has(t)) intersection++;

  return intersection / Math.max(trigramsA.size, trigramsB.size);
}

const AUTO_LINK_RELATION = 'auto-linked-by-similarity';

/**
 * Perform auto-linking for a newly written memory
 *
 * If an embedding provider is given, generates an embedding for the new memory
 * and saves it to cache before searching for similar memories.
 *
 * @param memoryId - ID of the newly written memory
 * @param memoryContent - Content of the memory (for embedding generation)
 * @param basePath - Base path for memory storage
 * @param threshold - Similarity threshold for auto-linking
 * @param provider - Optional embedding provider (if not provided, uses cache only)
 * @returns Number of links created
 */
async function performAutoLink(
  memoryId: string,
  memoryContent: string,
  basePath: string,
  threshold: number,
  provider?: EmbeddingProvider
): Promise<number> {
  try {
    // If provider given, generate embedding for the new memory and save to cache
    if (provider) {
      const cachePath = path.join(basePath, 'embeddings.json');
      const embedding = await generateEmbedding(memoryContent, provider);

      // Save to cache
      const cache = await loadEmbeddingCache(cachePath);
      cache.memories[memoryId] = {
        embedding,
        hash: generateContentHash(memoryContent),
        timestamp: new Date().toISOString(),
      };
      await saveEmbeddingCache(cachePath, cache);

      log.debug('Generated embedding for auto-link', { memoryId });
    }

    // Find similar memories using embeddings cache
    // Provider is passed but findSimilarToMemory reads from cache
    const searchProvider = provider ?? { name: 'cache', generate: async () => [] };
    const similar = await findSimilarToMemory(
      memoryId,
      basePath,
      searchProvider,
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

    // Validate custom ID prefix matches type
    if (request.id) {
      const expectedPrefix = `${request.type}-`;
      if (!request.id.startsWith(expectedPrefix)) {
        const actualPrefix = request.id.split('-')[0];
        log.error('ID prefix mismatch', { id: request.id, type: request.type });
        return {
          status: 'error',
          error: `ID prefix "${actualPrefix}" does not match type "${request.type}". Custom IDs must start with "${expectedPrefix}"`,
        };
      }
    }

    // Check for cross-scope duplicates
    const duplicatePath = checkCrossScopeDuplicate(id, basePath, request.projectRoot);
    if (duplicatePath) {
      log.error('Duplicate ID in another scope', { id, path: duplicatePath });
      return {
        status: 'error',
        error: `Memory with ID "${id}" already exists in another scope: ${duplicatePath}`,
      };
    }

    // Check for similar titles (warning, not error)
    const similarTitles = await findSimilarTitles(request.title, basePath, id);

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
        request.content,
        basePath,
        request.autoLinkThreshold ?? 0.85,
        request.embeddingProvider
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
