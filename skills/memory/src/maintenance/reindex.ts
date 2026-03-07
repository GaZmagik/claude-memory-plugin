/**
 * Reindex - Re-add an orphan file to the index and graph
 *
 * Use when a memory file exists on disk but is missing from
 * index.json and/or graph.json. This can happen after manual
 * file operations or sync failures.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseMemoryFile } from '../core/frontmatter.js';
import { addToIndex, findInIndex } from '../core/index.js';
import { loadGraph, saveGraph, addNode, hasNode } from '../graph/structure.js';
import { unsafeAsMemoryId } from '../types/branded.js';
import type { IndexEntry } from '../types/memory.js';
import { MemoryType, Scope } from '../types/enums.js';

/**
 * Reindex request options
 */
export interface ReindexRequest {
  /** Memory ID to reindex */
  id: string;
  /** Base path for memory storage */
  basePath: string;
}

/**
 * Reindex response
 */
export interface ReindexResponse {
  status: 'success' | 'error';
  /** Memory ID that was reindexed */
  id: string;
  /** File path found */
  filePath?: string;
  /** Actions taken */
  actions: {
    addedToIndex: boolean;
    addedToGraph: boolean;
  };
  /** Error message if failed */
  error?: string;
}

/**
 * Find a memory file by ID on disk
 */
function findMemoryFile(basePath: string, id: string): string | null {
  // Check permanent directory first
  const permanentPath = path.join(basePath, 'permanent', `${id}.md`);
  if (fs.existsSync(permanentPath)) {
    return permanentPath;
  }

  // Check temporary directory
  const temporaryPath = path.join(basePath, 'temporary', `${id}.md`);
  if (fs.existsSync(temporaryPath)) {
    return temporaryPath;
  }

  return null;
}

/**
 * Determine if file is in temporary or permanent directory
 */
function isTemporary(filePath: string): boolean {
  return filePath.includes('/temporary/') || filePath.includes('\\temporary\\');
}

/**
 * Re-adds an orphan memory file to the index and graph.
 *
 * Use this function when a memory file exists on disk but is missing from
 * index.json and/or graph.json. This can occur after manual file operations,
 * sync failures, or when restoring files from backup.
 *
 * The function reads the memory file's frontmatter to extract metadata and
 * adds appropriate entries to both the index and graph if they don't already
 * exist.
 *
 * @param request - The reindex request options
 * @param request.id - The unique identifier of the memory to reindex (filename without .md)
 * @param request.basePath - The base path for memory storage
 * @returns A promise resolving to a ReindexResponse indicating success or failure,
 *          including which actions were taken (added to index/graph)
 * @throws Never throws directly; errors are captured in the response object
 *
 * @example
 * ```typescript
 * import { reindexMemory } from './maintenance/reindex.js';
 *
 * // Reindex a memory that was manually restored
 * const result = await reindexMemory({
 *   id: 'decision-api-versioning-strategy',
 *   basePath: '/project/.claude/memory',
 * });
 *
 * if (result.status === 'success') {
 *   console.log(`File found at: ${result.filePath}`);
 *   console.log(`Added to index: ${result.actions.addedToIndex}`);
 *   console.log(`Added to graph: ${result.actions.addedToGraph}`);
 * } else {
 *   console.error(`Reindex failed: ${result.error}`);
 * }
 * ```
 */
export async function reindexMemory(request: ReindexRequest): Promise<ReindexResponse> {
  const { id, basePath } = request;

  const actions = {
    addedToIndex: false,
    addedToGraph: false,
  };

  // Find the file on disk
  const filePath = findMemoryFile(basePath, id);
  if (!filePath) {
    return {
      status: 'error',
      id,
      actions,
      error: `File not found: ${id}.md (checked permanent/ and temporary/)`,
    };
  }

  // Parse the file
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return {
      status: 'error',
      id,
      filePath,
      actions,
      error: `Failed to read file: ${err}`,
    };
  }

  const parsed = parseMemoryFile(content);
  // Note: parseMemoryFile throws on invalid input, no null check needed

  const { frontmatter } = parsed;
  const temporary = isTemporary(filePath);
  const relativePath = temporary ? `temporary/${id}.md` : `permanent/${id}.md`;

  // Check and add to index
  const existingIndexEntry = await findInIndex(basePath, id);
  if (!existingIndexEntry) {
    const indexEntry: IndexEntry = {
      id: unsafeAsMemoryId(id),
      title: frontmatter.title,
      type: frontmatter.type as MemoryType,
      tags: frontmatter.tags ?? [],
      created: frontmatter.created,
      updated: frontmatter.updated,
      scope: (frontmatter.scope as Scope) ?? Scope.Project,
      relativePath,
      severity: frontmatter.severity,
    };

    await addToIndex(basePath, indexEntry);
    actions.addedToIndex = true;
  }

  // Check and add to graph
  let graph = await loadGraph(basePath);
  if (!hasNode(graph, id)) {
    graph = addNode(graph, {
      id,
      type: frontmatter.type as MemoryType,
    });
    await saveGraph(basePath, graph);
    actions.addedToGraph = true;
  }

  return {
    status: 'success',
    id,
    filePath,
    actions,
  };
}
