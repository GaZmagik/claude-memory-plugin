/**
 * T027: Index Entity and Cache Operations
 *
 * Manages the index.json cache for fast memory lookups.
 */

import * as path from 'node:path';
import type { MemoryIndex, IndexEntry } from '../types/memory.js';
import type { RebuildIndexRequest, RebuildIndexResponse, LoadIndexRequest } from '../types/api.js';
import { listMarkdownFiles, readJsonFile, writeJsonFile, fileExists, readFile } from './fs-utils.js';
import { parseMemoryFile } from './frontmatter.js';
import { parseId } from './slug.js';
import { createLogger } from './logger.js';
import { Scope } from '../types/enums.js';

const log = createLogger('index');

const INDEX_VERSION = '1.0.0';
const INDEX_FILENAME = 'index.json';

/**
 * Get the path to the index file
 */
export function getIndexPath(basePath: string): string {
  return path.join(basePath, INDEX_FILENAME);
}

/**
 * Create an empty index
 */
export function createEmptyIndex(): MemoryIndex {
  return {
    version: INDEX_VERSION,
    lastUpdated: new Date().toISOString(),
    memories: [],
  };
}

/**
 * Load the index from disk
 */
export async function loadIndex(request: LoadIndexRequest): Promise<MemoryIndex> {
  const basePath = request.basePath ?? process.cwd();
  const indexPath = getIndexPath(basePath);

  if (!fileExists(indexPath)) {
    return createEmptyIndex();
  }

  const index = readJsonFile<MemoryIndex>(indexPath);

  if (!index) {
    log.warn('Failed to parse index, returning empty', { path: indexPath });
    return createEmptyIndex();
  }

  return index;
}

/**
 * Save the index to disk
 */
export function saveIndex(basePath: string, index: MemoryIndex): void {
  const indexPath = getIndexPath(basePath);
  index.lastUpdated = new Date().toISOString();
  writeJsonFile(indexPath, index);
  log.debug('Saved index', { path: indexPath, memories: index.memories.length });
}

/**
 * Add an entry to the index
 */
export async function addToIndex(basePath: string, entry: IndexEntry): Promise<void> {
  const index = await loadIndex({ basePath });

  // Remove existing entry with same ID if present
  index.memories = index.memories.filter(e => e.id !== entry.id);

  // Add new entry
  index.memories.push(entry);

  saveIndex(basePath, index);
  log.debug('Added to index', { id: entry.id });
}

/**
 * Remove an entry from the index
 */
export async function removeFromIndex(basePath: string, id: string): Promise<boolean> {
  const index = await loadIndex({ basePath });
  const initialLength = index.memories.length;

  index.memories = index.memories.filter(e => e.id !== id);

  if (index.memories.length < initialLength) {
    saveIndex(basePath, index);
    log.debug('Removed from index', { id });
    return true;
  }

  return false;
}

/**
 * Find an entry in the index by ID
 */
export async function findInIndex(basePath: string, id: string): Promise<IndexEntry | null> {
  const index = await loadIndex({ basePath });
  return index.memories.find(e => e.id === id) ?? null;
}

/**
 * Create an index entry from a memory file
 */
function createIndexEntry(
  id: string,
  filePath: string,
  basePath: string,
  frontmatter: {
    type: string;
    title: string;
    tags: string[];
    created: string;
    updated: string;
    severity?: string;
  }
): IndexEntry {
  const parsed = parseId(id);
  const scope = Scope.Global; // Default scope, will be determined by resolver in Phase 2

  return {
    id,
    type: parsed?.type ?? frontmatter.type as IndexEntry['type'],
    title: frontmatter.title,
    tags: frontmatter.tags,
    created: frontmatter.created,
    updated: frontmatter.updated,
    scope,
    relativePath: path.relative(basePath, filePath),
    severity: frontmatter.severity as IndexEntry['severity'],
  };
}

/**
 * Rebuild the index from filesystem
 */
export async function rebuildIndex(request: RebuildIndexRequest): Promise<RebuildIndexResponse> {
  const basePath = request.basePath ?? process.cwd();

  try {
    const existingIndex = await loadIndex({ basePath });
    const existingIds = new Set(existingIndex.memories.map(e => e.id));

    const files = listMarkdownFiles(basePath);
    const newEntries: IndexEntry[] = [];
    const foundIds = new Set<string>();

    let newEntriesAdded = 0;

    for (const filePath of files) {
      try {
        const content = readFile(filePath);
        const { frontmatter } = parseMemoryFile(content);

        // Extract ID from filename
        const filename = path.basename(filePath, '.md');
        const id = filename;

        foundIds.add(id);

        const entry = createIndexEntry(id, filePath, basePath, {
          type: frontmatter.type,
          title: frontmatter.title,
          tags: frontmatter.tags,
          created: frontmatter.created,
          updated: frontmatter.updated,
          severity: frontmatter.severity,
        });

        newEntries.push(entry);

        if (!existingIds.has(id)) {
          newEntriesAdded++;
        }
      } catch (error) {
        log.warn('Failed to parse memory file', { path: filePath, error: String(error) });
      }
    }

    // Calculate orphans (entries in index but not on disk)
    const orphansRemoved = existingIndex.memories.filter(e => !foundIds.has(e.id)).length;

    // Create new index
    const newIndex: MemoryIndex = {
      version: INDEX_VERSION,
      lastUpdated: new Date().toISOString(),
      memories: newEntries,
    };

    saveIndex(basePath, newIndex);

    log.info('Rebuilt index', {
      memories: newEntries.length,
      orphansRemoved,
      newEntriesAdded,
    });

    return {
      status: 'success',
      entriesCount: newEntries.length,
      orphansRemoved,
      newEntriesAdded,
    };
  } catch (error) {
    log.error('Failed to rebuild index', { error: String(error) });
    return {
      status: 'error',
      error: `Failed to rebuild index: ${String(error)}`,
    };
  }
}
