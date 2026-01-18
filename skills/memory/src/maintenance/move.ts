/**
 * Move - Move a memory between scopes
 *
 * Moves a memory file from one scope to another:
 * - project (.claude/memory/)
 * - local (.claude/memory/local/)
 * - global (~/.claude/memory/)
 *
 * Updates frontmatter scope field and handles graph/index updates.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseMemoryFile,
  serialiseMemoryFile,
  updateFrontmatter,
} from '../core/frontmatter.js';
import { isInsideDir } from '../core/fs-utils.js';
import { addToIndex, removeFromIndex } from '../core/index.js';
import { loadGraph, saveGraph, addNode, removeNode } from '../graph/structure.js';
import { unsafeAsMemoryId } from '../types/branded.js';
import type { IndexEntry } from '../types/memory.js';
import { MemoryType, Scope } from '../types/enums.js';
import type { EmbeddingCache } from '../search/embedding.js';

/**
 * Move request options
 */
export interface MoveRequest {
  /** Memory ID to move */
  id: string;
  /** Source base path */
  sourceBasePath: string;
  /** Target base path */
  targetBasePath: string;
  /** Target scope (for frontmatter update) */
  targetScope: Scope;
}

/**
 * Move response
 */
export interface MoveResponse {
  status: 'success' | 'error';
  id: string;
  /** Source path */
  sourcePath?: string;
  /** Target path */
  targetPath?: string;
  /** Changes made */
  changes: {
    fileMoved: boolean;
    sourceGraphUpdated: boolean;
    targetGraphUpdated: boolean;
    sourceIndexUpdated: boolean;
    targetIndexUpdated: boolean;
    embeddingsTransferred: boolean;
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
 * Determine if file is in temporary or permanent directory
 */
function isTemporary(filePath: string): boolean {
  return filePath.includes('/temporary/') || filePath.includes('\\temporary\\');
}

/**
 * Move a memory to a different scope
 */
export async function moveMemory(request: MoveRequest): Promise<MoveResponse> {
  const { id, sourceBasePath, targetBasePath, targetScope } = request;

  const changes = {
    fileMoved: false,
    sourceGraphUpdated: false,
    targetGraphUpdated: false,
    sourceIndexUpdated: false,
    targetIndexUpdated: false,
    embeddingsTransferred: false,
  };

  // Don't move to same location
  if (sourceBasePath === targetBasePath) {
    return {
      status: 'error',
      id,
      changes,
      error: 'Source and target scopes are the same',
    };
  }

  // Find source file
  const sourcePath = findMemoryFile(sourceBasePath, id);
  if (!sourcePath) {
    return {
      status: 'error',
      id,
      changes,
      error: `Memory not found: ${id}`,
    };
  }

  // Determine target directory (preserve permanent/temporary)
  const isTemp = isTemporary(sourcePath);
  const subdir = isTemp ? 'temporary' : 'permanent';
  const targetDir = path.join(targetBasePath, subdir);
  const targetPath = path.join(targetDir, `${id}.md`);

  // Validate target path stays within targetBasePath (prevent path traversal)
  if (!isInsideDir(targetBasePath, targetPath)) {
    return {
      status: 'error',
      id,
      sourcePath,
      changes,
      error: 'Invalid ID: path traversal not allowed',
    };
  }

  // Check if target exists
  if (fs.existsSync(targetPath)) {
    return {
      status: 'error',
      id,
      sourcePath,
      changes,
      error: `Target already exists: ${targetPath}`,
    };
  }

  // Read source file
  const content = fs.readFileSync(sourcePath, 'utf8');
  const parsed = parseMemoryFile(content);
  // Note: parseMemoryFile throws on invalid input, no null check needed

  // Update scope in frontmatter
  const updatedFm = updateFrontmatter(parsed.frontmatter, {
    scope: targetScope,
  });

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Write to target and delete source
  const newContent = serialiseMemoryFile(updatedFm, parsed.content);
  fs.writeFileSync(targetPath, newContent, 'utf8');
  fs.unlinkSync(sourcePath);
  changes.fileMoved = true;

  // Update source graph (remove node and edges)
  try {
    let sourceGraph = await loadGraph(sourceBasePath);
    sourceGraph = removeNode(sourceGraph, id);
    await saveGraph(sourceBasePath, sourceGraph);
    changes.sourceGraphUpdated = true;
  } catch {
    // Source graph may not exist
  }

  // Update target graph (add node)
  try {
    let targetGraph = await loadGraph(targetBasePath);
    targetGraph = addNode(targetGraph, {
      id,
      type: String(parsed.frontmatter.type),
    });
    await saveGraph(targetBasePath, targetGraph);
    changes.targetGraphUpdated = true;
  } catch {
    // Target graph may not exist, create it
    const newGraph = { version: 1, nodes: [{ id, type: String(parsed.frontmatter.type) }], edges: [] };
    await saveGraph(targetBasePath, newGraph);
    changes.targetGraphUpdated = true;
  }

  // Update source index (remove)
  try {
    await removeFromIndex(sourceBasePath, id);
    changes.sourceIndexUpdated = true;
  } catch {
    // Source index may not exist
  }

  // Update target index (add)
  try {
    const indexEntry: IndexEntry = {
      id: unsafeAsMemoryId(id),
      title: updatedFm.title,
      type: updatedFm.type as MemoryType,
      tags: updatedFm.tags ?? [],
      created: updatedFm.created,
      updated: updatedFm.updated,
      scope: targetScope,
      relativePath: `${subdir}/${id}.md`,
      severity: updatedFm.severity,
    };
    await addToIndex(targetBasePath, indexEntry);
    changes.targetIndexUpdated = true;
  } catch {
    // Index update failed
  }

  // Transfer embedding from source to target scope
  try {
    const sourceEmbeddingsPath = path.join(sourceBasePath, 'embeddings.json');
    if (fs.existsSync(sourceEmbeddingsPath)) {
      const sourceContent = fs.readFileSync(sourceEmbeddingsPath, 'utf-8');
      const sourceCache = JSON.parse(sourceContent) as EmbeddingCache;

      if (sourceCache.memories && sourceCache.memories[id]) {
        const embedding = sourceCache.memories[id];

        // Add to target embeddings
        const targetEmbeddingsPath = path.join(targetBasePath, 'embeddings.json');
        let targetCache: EmbeddingCache = { version: 1, memories: {} };
        if (fs.existsSync(targetEmbeddingsPath)) {
          const targetContent = fs.readFileSync(targetEmbeddingsPath, 'utf-8');
          targetCache = JSON.parse(targetContent) as EmbeddingCache;
        }
        if (!targetCache.memories) {
          targetCache.memories = {};
        }
        targetCache.memories[id] = embedding;
        fs.writeFileSync(targetEmbeddingsPath, JSON.stringify(targetCache, null, 2));

        // Remove from source embeddings
        delete sourceCache.memories[id];
        fs.writeFileSync(sourceEmbeddingsPath, JSON.stringify(sourceCache, null, 2));

        changes.embeddingsTransferred = true;
      }
    }
  } catch {
    // Embeddings transfer is best-effort
  }

  return {
    status: 'success',
    id,
    sourcePath,
    targetPath,
    changes,
  };
}
