/**
 * Sync - Reconcile graph, index, and disk
 *
 * Ensures consistency between:
 * - Files on disk (permanent/ and temporary/ directories)
 * - Graph nodes and edges (graph.json)
 * - Index entries (index.json)
 *
 * Actions taken:
 * - Add missing files to graph/index
 * - Remove ghost nodes (graph nodes without files)
 * - Remove orphan edges (edges pointing to missing nodes)
 * - Update index for files not indexed
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
import { removeEdge, getEdges } from '../graph/edges.js';
import { loadIndex, saveIndex } from '../core/index.js';
import type { IndexEntry, MemoryIndex } from '../types/memory.js';
import { MemoryType, Scope } from '../types/enums.js';

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
  };
  /** Summary counts */
  summary: {
    filesOnDisk: number;
    nodesInGraph: number;
    entriesInIndex: number;
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

    if (!parsed.frontmatter) return null;

    return {
      id,
      type: String(parsed.frontmatter.type),
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

    if (!parsed.frontmatter) return null;

    const fm = parsed.frontmatter;
    const isTemporary = filePath.includes('/temporary/');

    return {
      id,
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
  const nodeIds = new Set(graph.nodes.map(n => n.id));
  const indexIds = new Set(index.memories.map(e => e.id));
  const fileIds = new Set(filesOnDisk.keys());

  // 1. Find files not in graph - add them
  for (const [id, filePath] of filesOnDisk) {
    if (!nodeIds.has(id)) {
      const node = parseFileToNode(id, filePath);
      if (node) {
        changes.addedToGraph.push(id);
        if (!dryRun) {
          graph = addNode(graph, node);
        }
      }
    }
  }

  // 2. Find files not in index - add them
  for (const [id, filePath] of filesOnDisk) {
    if (!indexIds.has(id)) {
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

  // Save changes if not dry run
  if (!dryRun) {
    try {
      await saveGraph(basePath, graph);
    } catch (err) {
      errors.push(`Failed to save graph: ${err}`);
    }

    try {
      saveIndex(basePath, index);
    } catch (err) {
      errors.push(`Failed to save index: ${err}`);
    }
  }

  return {
    status: errors.length > 0 ? 'error' : 'success',
    changes,
    summary: {
      filesOnDisk: filesOnDisk.size,
      nodesInGraph: dryRun ? graph.nodes.length : graph.nodes.length,
      entriesInIndex: dryRun ? index.memories.length : index.memories.length,
    },
    ...(errors.length > 0 && { errors }),
  };
}
