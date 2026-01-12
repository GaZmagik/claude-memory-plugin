/**
 * Rename - Rename a memory ID and update all references
 *
 * Updates:
 * - Filename on disk
 * - Graph node ID
 * - All edge references (source/target)
 * - Index entry
 * - Frontmatter ID (if stored in meta)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseMemoryFile,
  serialiseMemoryFile,
  updateFrontmatter,
} from '../core/frontmatter.js';
import { loadIndex, saveIndex } from '../core/index.js';
import { loadGraph, saveGraph, type MemoryGraph } from '../graph/structure.js';

/**
 * Rename request options
 */
export interface RenameRequest {
  /** Current memory ID */
  oldId: string;
  /** New memory ID */
  newId: string;
  /** Base path for memory storage */
  basePath: string;
}

/**
 * Rename response
 */
export interface RenameResponse {
  status: 'success' | 'error';
  oldId: string;
  newId: string;
  /** File path after rename */
  newPath?: string;
  /** Changes made */
  changes: {
    fileRenamed: boolean;
    graphNodeUpdated: boolean;
    edgesUpdated: number;
    indexUpdated: boolean;
  };
  error?: string;
}

/**
 * Find a memory file by ID
 */
function findMemoryFile(basePath: string, id: string): string | null {
  const permanentPath = path.join(basePath, 'permanent', `${id}.md`);
  if (fs.existsSync(permanentPath)) {
    return permanentPath;
  }

  const temporaryPath = path.join(basePath, 'temporary', `${id}.md`);
  if (fs.existsSync(temporaryPath)) {
    return temporaryPath;
  }

  return null;
}

/**
 * Rename a memory and update all references
 */
export async function renameMemory(request: RenameRequest): Promise<RenameResponse> {
  const { oldId, newId, basePath } = request;

  const changes = {
    fileRenamed: false,
    graphNodeUpdated: false,
    edgesUpdated: 0,
    indexUpdated: false,
  };

  // Find the source file
  const oldPath = findMemoryFile(basePath, oldId);
  if (!oldPath) {
    return {
      status: 'error',
      oldId,
      newId,
      changes,
      error: `Memory not found: ${oldId}`,
    };
  }

  // Determine new path (same directory)
  const dir = path.dirname(oldPath);
  const newPath = path.join(dir, `${newId}.md`);

  // Check if target already exists
  if (fs.existsSync(newPath)) {
    return {
      status: 'error',
      oldId,
      newId,
      changes,
      error: `Target already exists: ${newId}`,
    };
  }

  // Read and update file content
  const content = fs.readFileSync(oldPath, 'utf8');
  const parsed = parseMemoryFile(content);

  if (!parsed.frontmatter) {
    return {
      status: 'error',
      oldId,
      newId,
      changes,
      error: 'Failed to parse frontmatter',
    };
  }

  // Update frontmatter if it contains ID in meta
  const updatedMeta = { ...(parsed.frontmatter.meta ?? {}) };
  if (updatedMeta.id === oldId) {
    updatedMeta.id = newId;
  }

  const updatedFm = updateFrontmatter(parsed.frontmatter, {
    meta: Object.keys(updatedMeta).length > 0 ? updatedMeta : undefined,
  });

  // Write to new path and delete old
  const newContent = serialiseMemoryFile(updatedFm, parsed.content);
  fs.writeFileSync(newPath, newContent, 'utf8');
  fs.unlinkSync(oldPath);
  changes.fileRenamed = true;

  // Update graph
  let graph = await loadGraph(basePath);

  // Update node ID
  const nodeIndex = graph.nodes.findIndex(n => n.id === oldId);
  if (nodeIndex >= 0) {
    graph.nodes[nodeIndex] = { ...graph.nodes[nodeIndex], id: newId };
    changes.graphNodeUpdated = true;
  }

  // Update edge references
  const updatedGraph: MemoryGraph = {
    ...graph,
    edges: graph.edges.map(edge => {
      let updated = false;
      const newEdge = { ...edge };

      if (edge.source === oldId) {
        newEdge.source = newId;
        updated = true;
      }
      if (edge.target === oldId) {
        newEdge.target = newId;
        updated = true;
      }

      if (updated) {
        changes.edgesUpdated++;
      }
      return newEdge;
    }),
  };

  await saveGraph(basePath, updatedGraph);

  // Update index
  const index = await loadIndex({ basePath });
  const entryIndex = index.memories.findIndex(e => e.id === oldId);
  if (entryIndex >= 0) {
    index.memories[entryIndex] = {
      ...index.memories[entryIndex],
      id: newId,
      relativePath: index.memories[entryIndex].relativePath.replace(oldId, newId),
    };
    saveIndex(basePath, index);
    changes.indexUpdated = true;
  }

  return {
    status: 'success',
    oldId,
    newId,
    newPath,
    changes,
  };
}
