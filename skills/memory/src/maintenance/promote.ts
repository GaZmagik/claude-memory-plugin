/**
 * Promote - Change a memory's type
 *
 * Converts a memory from one type to another:
 * - learning -> gotcha (promote)
 * - gotcha -> learning (demote)
 * - breadcrumb -> artifact (promote)
 * - temporary thinking -> decision/learning/artifact (promote and make permanent)
 *
 * Updates frontmatter type, tags, and moves between permanent/temporary if needed.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseMemoryFile,
  serialiseMemoryFile,
  updateFrontmatter,
} from '../core/frontmatter.js';
import { loadIndex, saveIndex } from '../core/index.js';
import { loadGraph, saveGraph } from '../graph/structure.js';
import { MemoryType } from '../types/enums.js';
import { renameMemory } from './rename.js';
import { parseId } from '../core/slug.js';

/**
 * Promote request options
 */
export interface PromoteRequest {
  /** Memory ID to promote */
  id: string;
  /** Target type */
  targetType: MemoryType;
  /** Base path for memory storage */
  basePath: string;
}

/**
 * Promote response
 */
export interface PromoteResponse {
  status: 'success' | 'error';
  id: string;
  /** New ID if renamed (when type prefix changes) */
  newId?: string;
  /** Original type */
  fromType?: string;
  /** New type */
  toType: string;
  /** Changes made */
  changes: {
    frontmatterUpdated: boolean;
    fileMoved: boolean;
    graphUpdated: boolean;
    indexUpdated: boolean;
    fileRenamed: boolean;
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
 * Determine if file is in temporary directory
 */
function isTemporary(filePath: string): boolean {
  return filePath.includes('/temporary/') || filePath.includes('\\temporary\\');
}

/**
 * Determine if a type should be permanent
 * All standard memory types are permanent (think docs are handled separately)
 */
function shouldBePermanent(_type: MemoryType): boolean {
  // All MemoryType enum values are permanent types
  return true;
}

/**
 * Promote/demote a memory to a different type
 */
export async function promoteMemory(request: PromoteRequest): Promise<PromoteResponse> {
  const { id, targetType, basePath } = request;

  const changes = {
    frontmatterUpdated: false,
    fileMoved: false,
    graphUpdated: false,
    indexUpdated: false,
    fileRenamed: false,
  };

  // Find the file
  const currentPath = findMemoryFile(basePath, id);
  if (!currentPath) {
    return {
      status: 'error',
      id,
      toType: targetType,
      changes,
      error: `Memory not found: ${id}`,
    };
  }

  // Read current file
  const content = fs.readFileSync(currentPath, 'utf8');
  const parsed = parseMemoryFile(content);
  // Note: parseMemoryFile throws on invalid input, no null check needed

  const fromType = parsed.frontmatter.type;

  // Check if type is already correct
  if (fromType === targetType) {
    return {
      status: 'success',
      id,
      fromType,
      toType: targetType,
      changes,
    };
  }

  // Update frontmatter
  const updatedFm = updateFrontmatter(parsed.frontmatter, {
    type: targetType,
  });

  // Determine if file needs to move between permanent/temporary
  const currentlyTemporary = isTemporary(currentPath);
  const shouldBePermNow = shouldBePermanent(targetType);
  const needsMove = currentlyTemporary && shouldBePermNow;

  let newPath = currentPath;

  if (needsMove) {
    // Move from temporary to permanent
    const permanentDir = path.join(basePath, 'permanent');
    if (!fs.existsSync(permanentDir)) {
      fs.mkdirSync(permanentDir, { recursive: true });
    }
    newPath = path.join(permanentDir, `${id}.md`);

    if (fs.existsSync(newPath)) {
      return {
        status: 'error',
        id,
        fromType,
        toType: targetType,
        changes,
        error: `Target already exists in permanent: ${id}`,
      };
    }
  }

  // Write updated file
  const newContent = serialiseMemoryFile(updatedFm, parsed.content);
  fs.writeFileSync(newPath, newContent, 'utf8');
  changes.frontmatterUpdated = true;

  // Delete old file if moved
  if (needsMove && newPath !== currentPath) {
    fs.unlinkSync(currentPath);
    changes.fileMoved = true;
  }

  // Update graph node type
  try {
    const graph = await loadGraph(basePath);
    const nodeIndex = graph.nodes.findIndex(n => n.id === id);
    if (nodeIndex >= 0) {
      graph.nodes[nodeIndex] = { ...graph.nodes[nodeIndex], type: targetType };
      await saveGraph(basePath, graph);
      changes.graphUpdated = true;
    }
  } catch {
    // Graph may not exist
  }

  // Update index
  try {
    const index = await loadIndex({ basePath });
    const entryIndex = index.memories.findIndex(e => e.id === id);
    if (entryIndex >= 0) {
      index.memories[entryIndex] = {
        ...index.memories[entryIndex],
        type: targetType,
        relativePath: needsMove ? `permanent/${id}.md` : index.memories[entryIndex].relativePath,
      };
      await saveIndex(basePath, index);
      changes.indexUpdated = true;
    }
  } catch {
    // Index may not exist
  }

  // Rename file if ID prefix doesn't match the new type
  // e.g., learning-foo promoted to decision should become decision-foo
  let newId: string | undefined;
  const parsedId = parseId(id);

  if (parsedId && parsedId.type !== targetType) {
    // ID has a different type prefix - need to rename
    newId = `${targetType}-${parsedId.slug}`;

    try {
      const renameResult = await renameMemory({
        oldId: id,
        newId,
        basePath,
      });

      if (renameResult.status === 'success') {
        changes.fileRenamed = true;
      } else {
        // Rename failed but promotion succeeded - warn but don't fail
        // The memory has correct type in frontmatter, just wrong filename
      }
    } catch {
      // Rename failed - promotion still succeeded
    }
  }

  return {
    status: 'success',
    id,
    newId,
    fromType,
    toType: targetType,
    changes,
  };
}
