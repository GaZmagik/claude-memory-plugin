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
 * Reindex a single memory file
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
  if (!parsed.frontmatter) {
    return {
      status: 'error',
      id,
      filePath,
      actions,
      error: 'Failed to parse frontmatter from file',
    };
  }

  const { frontmatter } = parsed;
  const temporary = isTemporary(filePath);
  const relativePath = temporary ? `temporary/${id}.md` : `permanent/${id}.md`;

  // Check and add to index
  const existingIndexEntry = await findInIndex(basePath, id);
  if (!existingIndexEntry) {
    const indexEntry: IndexEntry = {
      id,
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
      type: String(frontmatter.type),
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
