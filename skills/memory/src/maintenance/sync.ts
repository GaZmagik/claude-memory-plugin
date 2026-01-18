/**
 * Sync - Reconcile graph, index, embeddings, and disk
 *
 * Ensures consistency between:
 * - Files on disk (permanent/ and temporary/ directories)
 * - Graph nodes and edges (graph.json)
 * - Index entries (index.json)
 * - Embedding entries (embeddings.json)
 *
 * Actions taken:
 * - Add missing files to graph/index
 * - Remove ghost nodes (graph nodes without files)
 * - Remove orphan edges (edges pointing to missing nodes)
 * - Remove orphan index entries (entries without files)
 * - Remove orphan embedding entries (embeddings without files)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseMemoryFile } from '../core/frontmatter.js';
import {
  loadGraph,
  saveGraph,
  addNode,
  removeNode,
  type MemoryGraph,
  type GraphNode,
} from '../graph/structure.js';
import { unsafeAsMemoryId } from '../types/branded.js';
import { removeEdge, getEdges } from '../graph/edges.js';
import { loadIndex, saveIndex } from '../core/index.js';
import type { IndexEntry, MemoryIndex } from '../types/memory.js';
import { MemoryType, Scope } from '../types/enums.js';
import type { EmbeddingCache } from '../search/embedding.js';

/**
 * Sync request options
 */
export interface SyncRequest {
  /** Base path for memory storage */
  basePath: string;
  /** Dry run - report changes without applying */
  dryRun?: boolean;
}

/**
 * Sync response
 */
export interface SyncResponse {
  status: 'success' | 'error';
  changes: {
    /** Files added to graph */
    addedToGraph: string[];
    /** Files added to index */
    addedToIndex: string[];
    /** Ghost nodes removed from graph */
    removedGhostNodes: string[];
    /** Orphan edges removed */
    removedOrphanEdges: number;
    /** Index entries removed (no file) */
    removedFromIndex: string[];
    /** Orphan embedding entries removed */
    removedOrphanEmbeddings: string[];
  };
  /** Summary counts */
  summary: {
    filesOnDisk: number;
    nodesInGraph: number;
    entriesInIndex: number;
    entriesInEmbeddings: number;
  };
  errors?: string[];
}

/**
 * Get all memory files from disk
 */
function getFilesOnDisk(basePath: string): Map<string, string> {
  const files = new Map<string, string>();

  for (const subdir of ['permanent', 'temporary']) {
    const dir = path.join(basePath, subdir);
    if (!fs.existsSync(dir)) continue;

    const mdFiles = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const file of mdFiles) {
      const id = file.replace('.md', '');
      files.set(id, path.join(dir, file));
    }
  }

  return files;
}

/**
 * Parse a memory file to extract node info
 */
function parseFileToNode(id: string, filePath: string): GraphNode | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = parseMemoryFile(content);
    // Note: parseMemoryFile throws on invalid input, caught below

    return {
      id,
      type: String(parsed.frontmatter.type),
      title: parsed.frontmatter.title,
    };
  } catch {
    return null;
  }
}

/**
 * Parse a memory file to extract index entry
 */
function parseFileToIndexEntry(id: string, filePath: string): IndexEntry | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = parseMemoryFile(content);
    // Note: parseMemoryFile throws on invalid input, caught below

    const fm = parsed.frontmatter;
    const isTemporary = filePath.includes('/temporary/');

    return {
      id: unsafeAsMemoryId(id),
      title: fm.title,
      type: fm.type as MemoryType,
      tags: fm.tags ?? [],
      created: fm.created,
      updated: fm.updated,
      scope: (fm.scope as Scope) ?? Scope.Project,
      relativePath: isTemporary ? `temporary/${id}.md` : `permanent/${id}.md`,
    };
  } catch {
    return null;
  }
}

/**
 * Sync graph, index, and disk
 */
export async function syncMemories(request: SyncRequest): Promise<SyncResponse> {
  const { basePath, dryRun = false } = request;

  const errors: string[] = [];
  const changes = {
    addedToGraph: [] as string[],
    addedToIndex: [] as string[],
    removedGhostNodes: [] as string[],
    removedOrphanEdges: 0,
    removedFromIndex: [] as string[],
    removedOrphanEmbeddings: [] as string[],
  };

  // Load current state
  const filesOnDisk = getFilesOnDisk(basePath);
  let graph: MemoryGraph;
  let index: MemoryIndex;

  try {
    graph = await loadGraph(basePath);
  } catch {
    graph = { version: 1, nodes: [], edges: [] };
  }

  try {
    index = await loadIndex({ basePath });
  } catch {
    index = { version: '1.0', memories: [], lastUpdated: new Date().toISOString() };
  }

  // Build lookup sets
  const indexIds = new Set(index.memories.map(e => e.id));
  const fileIds = new Set(filesOnDisk.keys());

  // 1. Find files not in graph - add them
  // Also refresh existing nodes that are missing title
  for (const [id, filePath] of filesOnDisk) {
    const existingNode = graph.nodes.find(n => n.id === id);

    if (!existingNode) {
      // Node missing entirely - add it
      const node = parseFileToNode(id, filePath);
      if (node) {
        changes.addedToGraph.push(id);
        if (!dryRun) {
          graph = addNode(graph, node);
        }
      }
    } else if (!existingNode.title) {
      // Node exists but missing title - refresh it
      const node = parseFileToNode(id, filePath);
      if (node && !dryRun) {
        graph = addNode(graph, node); // addNode updates existing nodes
      }
    }
  }

  // 2. Find files not in index - add them
  for (const [id, filePath] of filesOnDisk) {
    if (!indexIds.has(unsafeAsMemoryId(id))) {
      const entry = parseFileToIndexEntry(id, filePath);
      if (entry) {
        changes.addedToIndex.push(id);
        if (!dryRun) {
          index.memories.push(entry);
        }
      }
    }
  }

  // 3. Find ghost nodes (in graph but no file) - remove them
  for (const node of graph.nodes) {
    if (!fileIds.has(node.id)) {
      changes.removedGhostNodes.push(node.id);
      if (!dryRun) {
        graph = removeNode(graph, node.id);
      }
    }
  }

  // 4. Find orphan edges (pointing to non-existent nodes) - remove them
  const validNodeIds = dryRun ? fileIds : new Set(graph.nodes.map(n => n.id));
  const edges = getEdges(graph);
  for (const edge of edges) {
    if (!validNodeIds.has(edge.source) || !validNodeIds.has(edge.target)) {
      changes.removedOrphanEdges++;
      if (!dryRun) {
        graph = removeEdge(graph, edge.source, edge.target);
      }
    }
  }

  // 5. Find index entries without files - remove them
  const memoriesToKeep: IndexEntry[] = [];
  for (const entry of index.memories) {
    if (!fileIds.has(entry.id)) {
      changes.removedFromIndex.push(entry.id);
    } else {
      memoriesToKeep.push(entry);
    }
  }
  if (!dryRun) {
    index.memories = memoriesToKeep;
    index.lastUpdated = new Date().toISOString();
  }

  // 6. Find orphan embedding entries (in embeddings.json but no file) - remove them
  let embeddingsCount = 0;
  const embeddingsPath = path.join(basePath, 'embeddings.json');
  if (fs.existsSync(embeddingsPath)) {
    try {
      const content = fs.readFileSync(embeddingsPath, 'utf-8');
      const cache = JSON.parse(content) as EmbeddingCache;

      if (cache.memories) {
        const embeddingIds = Object.keys(cache.memories);
        embeddingsCount = embeddingIds.length;

        for (const embeddingId of embeddingIds) {
          if (!fileIds.has(embeddingId)) {
            changes.removedOrphanEmbeddings.push(embeddingId);
            if (!dryRun) {
              delete cache.memories[embeddingId];
            }
          }
        }

        // Save cleaned embeddings if changes were made
        if (!dryRun && changes.removedOrphanEmbeddings.length > 0) {
          fs.writeFileSync(embeddingsPath, JSON.stringify(cache, null, 2));
          embeddingsCount = Object.keys(cache.memories).length;
        }
      }
    } catch (err) {
      errors.push(`Failed to clean embeddings: ${err}`);
    }
  }

  // Save changes if not dry run
  if (!dryRun) {
    try {
      await saveGraph(basePath, graph);
    } catch (err) {
      errors.push(`Failed to save graph: ${err}`);
    }

    try {
      await saveIndex(basePath, index);
    } catch (err) {
      errors.push(`Failed to save index: ${err}`);
    }
  }

  return {
    status: errors.length > 0 ? 'error' : 'success',
    changes,
    summary: {
      filesOnDisk: filesOnDisk.size,
      nodesInGraph: graph.nodes.length,
      entriesInIndex: index.memories.length,
      entriesInEmbeddings: embeddingsCount,
    },
    ...(errors.length > 0 && { errors }),
  };
}
