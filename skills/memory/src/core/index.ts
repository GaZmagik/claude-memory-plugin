/**
 * T027: Index Entity and Cache Operations
 *
 * Manages the index.json cache for fast memory lookups.
 */

import * as path from 'node:path';
import type { MemoryId } from '../types/branded.js';
import { unsafeAsMemoryId } from '../types/branded.js';
import type { MemoryIndex, IndexEntry } from '../types/memory.js';
import type { RebuildIndexRequest, RebuildIndexResponse, LoadIndexRequest } from '../types/api.js';
import { listMarkdownFiles, readJsonFile, writeJsonFile, fileExists, readFile } from './fs-utils.js';
import { parseMemoryFile } from './frontmatter.js';
import { parseId } from './slug.js';
import { createLogger } from './logger.js';
import { Scope } from '../types/enums.js';
import { loadEmbeddingCache } from '../search/embedding.js';

const log = createLogger('index');

const INDEX_VERSION = '1.0.0';
const INDEX_FILENAME = 'index.json';

/**
 * Constructs the full filesystem path to the index.json file.
 *
 * The index file is always named 'index.json' and is located at the root
 * of the memory base directory.
 *
 * @param basePath - The base directory path where memory files are stored
 * @returns The absolute path to the index.json file
 *
 * @example
 * ```typescript
 * const indexPath = getIndexPath('/home/user/.claude/memory');
 * // Returns: '/home/user/.claude/memory/index.json'
 * ```
 */
export function getIndexPath(basePath: string): string {
  return path.join(basePath, INDEX_FILENAME);
}

/**
 * Creates a new, empty memory index with default values.
 *
 * The returned index has the current version, a timestamp of creation,
 * and an empty memories array. This is used when no index file exists
 * or when the existing index is corrupted.
 *
 * @returns A new MemoryIndex object with version, lastUpdated timestamp, and empty memories array
 *
 * @example
 * ```typescript
 * const emptyIndex = createEmptyIndex();
 * // Returns: {
 * //   version: '1.0.0',
 * //   lastUpdated: '2026-02-07T19:00:00.000Z',
 * //   memories: []
 * // }
 * ```
 */
export function createEmptyIndex(): MemoryIndex {
  return {
    version: INDEX_VERSION,
    lastUpdated: new Date().toISOString(),
    memories: [],
  };
}

/**
 * Migrate legacy index entry with 'file' field to 'relativePath'
 * The bash version used absolute 'file' paths; TypeScript uses 'relativePath'
 */
function migrateIndexEntry(entry: IndexEntry & { file?: string }, basePath: string): IndexEntry {
  // If entry already has relativePath, return as-is
  if (entry.relativePath) {
    return entry;
  }

  // Migrate from legacy 'file' field (absolute path) to 'relativePath'
  if (entry.file) {
    const relativePath = path.relative(basePath, entry.file);
    const { file: _unused, ...rest } = entry;
    return { ...rest, relativePath };
  }

  // Fallback: construct relativePath from id - assume permanent unless id starts with thought-/think-
  const subdir = (entry.id.startsWith('thought-') || entry.id.startsWith('think-')) ? 'temporary' : 'permanent';
  return { ...entry, relativePath: `${subdir}/${entry.id}.md` };
}

/**
 * Loads the memory index from disk, handling migration and validation.
 *
 * This function reads the index.json file from the specified base path,
 * validates its structure, and migrates any legacy entries that use the
 * old 'file' field to the new 'relativePath' format. If the index file
 * does not exist or is invalid, an empty index is returned.
 *
 * @param request - The load request containing optional basePath (defaults to cwd)
 * @param request.basePath - Optional base directory path; defaults to process.cwd()
 * @returns Promise resolving to the loaded MemoryIndex, or an empty index if not found/invalid
 *
 * @example
 * ```typescript
 * // Load from default location
 * const index = await loadIndex({});
 *
 * // Load from specific path
 * const index = await loadIndex({ basePath: '/home/user/.claude/memory' });
 * console.log(`Found ${index.memories.length} memories`);
 * ```
 */
export async function loadIndex(request: LoadIndexRequest): Promise<MemoryIndex> {
  const basePath = request.basePath ?? process.cwd();
  const indexPath = getIndexPath(basePath);

  if (!(await fileExists(indexPath))) {
    return createEmptyIndex();
  }

  const index = await readJsonFile<MemoryIndex>(indexPath);

  if (!index) {
    log.warn('Failed to parse index, returning empty', { path: indexPath });
    return createEmptyIndex();
  }

  // Validate index structure - must have memories array
  if (!Array.isArray(index.memories)) {
    log.warn('Index has invalid structure (missing memories array), returning empty', { path: indexPath });
    return createEmptyIndex();
  }

  // Migrate legacy entries that have 'file' instead of 'relativePath'
  // Filter out null/invalid entries before migration
  index.memories = index.memories
    .filter(entry => entry && typeof entry === 'object' && typeof entry.id === 'string')
    .map(entry => migrateIndexEntry(entry, basePath));

  return index;
}

/**
 * Persists the memory index to disk as index.json.
 *
 * Updates the lastUpdated timestamp before saving. The index is written
 * as formatted JSON to the index.json file in the base directory.
 *
 * @param basePath - The base directory path where the index file will be saved
 * @param index - The MemoryIndex object to persist
 * @returns Promise that resolves when the file has been written
 * @throws May throw filesystem errors if the directory doesn't exist or isn't writable
 *
 * @example
 * ```typescript
 * const index = await loadIndex({ basePath: '/home/user/.claude/memory' });
 * index.memories.push(newEntry);
 * await saveIndex('/home/user/.claude/memory', index);
 * ```
 */
export async function saveIndex(basePath: string, index: MemoryIndex): Promise<void> {
  const indexPath = getIndexPath(basePath);
  index.lastUpdated = new Date().toISOString();
  await writeJsonFile(indexPath, index);
  log.debug('Saved index', { path: indexPath, memories: index.memories.length });
}

/**
 * Adds or updates an entry in the memory index.
 *
 * If an entry with the same ID already exists, it is replaced with the new entry.
 * The index is automatically saved to disk after the operation.
 *
 * @param basePath - The base directory path where the index file is located
 * @param entry - The IndexEntry to add or update in the index
 * @returns Promise that resolves when the entry has been added and index saved
 * @throws May throw filesystem errors if the index cannot be read or written
 *
 * @example
 * ```typescript
 * const entry: IndexEntry = {
 *   id: 'learning-typescript-generics' as MemoryId,
 *   type: 'learning',
 *   title: 'TypeScript Generics Best Practices',
 *   tags: ['typescript', 'generics'],
 *   created: new Date().toISOString(),
 *   updated: new Date().toISOString(),
 *   scope: Scope.Global,
 *   relativePath: 'permanent/learning-typescript-generics.md'
 * };
 * await addToIndex('/home/user/.claude/memory', entry);
 * ```
 */
export async function addToIndex(basePath: string, entry: IndexEntry): Promise<void> {
  const index = await loadIndex({ basePath });

  // Remove existing entry with same ID if present
  index.memories = index.memories.filter(e => e.id !== entry.id);

  // Add new entry
  index.memories.push(entry);

  await saveIndex(basePath, index);
  log.debug('Added to index', { id: entry.id });
}

/**
 * Removes an entry from the memory index by its ID.
 *
 * Searches for an entry with the matching ID and removes it from the index.
 * The index is only saved if an entry was actually removed.
 *
 * @param basePath - The base directory path where the index file is located
 * @param id - The unique identifier of the memory entry to remove
 * @returns Promise resolving to true if an entry was removed, false if no matching entry was found
 * @throws May throw filesystem errors if the index cannot be read or written
 *
 * @example
 * ```typescript
 * const wasRemoved = await removeFromIndex(
 *   '/home/user/.claude/memory',
 *   'learning-typescript-generics'
 * );
 * if (wasRemoved) {
 *   console.log('Entry removed successfully');
 * } else {
 *   console.log('Entry not found in index');
 * }
 * ```
 */
export async function removeFromIndex(basePath: string, id: string): Promise<boolean> {
  const index = await loadIndex({ basePath });
  const initialLength = index.memories.length;

  index.memories = index.memories.filter(e => e.id !== id);

  if (index.memories.length < initialLength) {
    await saveIndex(basePath, index);
    log.debug('Removed from index', { id });
    return true;
  }

  return false;
}

/**
 * Searches for a memory entry in the index by its unique ID.
 *
 * Loads the index and performs a linear search for an entry with the matching ID.
 *
 * @param basePath - The base directory path where the index file is located
 * @param id - The unique identifier of the memory entry to find
 * @returns Promise resolving to the IndexEntry if found, or null if not found
 *
 * @example
 * ```typescript
 * const entry = await findInIndex(
 *   '/home/user/.claude/memory',
 *   'gotcha-async-cleanup'
 * );
 * if (entry) {
 *   console.log(`Found: ${entry.title}`);
 *   console.log(`Tags: ${entry.tags.join(', ')}`);
 * }
 * ```
 */
export async function findInIndex(basePath: string, id: string): Promise<IndexEntry | null> {
  const index = await loadIndex({ basePath });
  return index.memories.find(e => e.id === id) ?? null;
}

/**
 * Removes multiple entries from the index in a single operation.
 *
 * This is more efficient than calling removeFromIndex multiple times as it
 * performs only one load/save cycle regardless of how many entries are removed.
 * The index is only saved if at least one entry was removed.
 *
 * @param basePath - The base directory path where the index file is located
 * @param ids - Array of unique identifiers of the memory entries to remove
 * @returns Promise resolving to the count of entries that were actually removed
 *
 * @example
 * ```typescript
 * const idsToRemove = [
 *   'thought-session-123',
 *   'thought-session-456',
 *   'thought-session-789'
 * ];
 * const removedCount = await batchRemoveFromIndex(
 *   '/home/user/.claude/memory',
 *   idsToRemove
 * );
 * console.log(`Removed ${removedCount} of ${idsToRemove.length} entries`);
 * ```
 */
export async function batchRemoveFromIndex(basePath: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const index = await loadIndex({ basePath });
  const idsSet = new Set(ids);
  const initialLength = index.memories.length;

  index.memories = index.memories.filter(e => !idsSet.has(e.id));

  const removedCount = initialLength - index.memories.length;
  if (removedCount > 0) {
    await saveIndex(basePath, index);
    log.debug('Batch removed from index', { count: removedCount });
  }

  return removedCount;
}

/**
 * Create an index entry from a memory file
 * @param id - Raw string ID from filename (will be cast to MemoryId)
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
  const memoryId = unsafeAsMemoryId(id);
  const parsed = parseId(memoryId);
  const scope = Scope.Global; // Default scope, will be determined by resolver in Phase 2

  return {
    id: memoryId,
    type: (frontmatter.type || parsed?.type) as IndexEntry['type'],
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
 * Rebuilds the memory index by scanning the filesystem for memory files.
 *
 * Scans the 'permanent/' and 'temporary/' subdirectories for markdown files,
 * parses their frontmatter, and creates a fresh index. Also detects orphaned
 * index entries (entries pointing to non-existent files) and memories that
 * are missing embeddings.
 *
 * This operation is useful for:
 * - Recovering from index corruption
 * - Synchronising the index after manual file changes
 * - Detecting missing embeddings that need regeneration
 *
 * @param request - The rebuild request containing optional basePath
 * @param request.basePath - Optional base directory path; defaults to process.cwd()
 * @returns Promise resolving to RebuildIndexResponse with statistics about the rebuild
 * @returns response.status - 'success' or 'error'
 * @returns response.entriesCount - Total number of entries in the rebuilt index
 * @returns response.orphansRemoved - Count of stale entries that were in the old index but not on disk
 * @returns response.newEntriesAdded - Count of new entries found on disk but not in old index
 * @returns response.missingEmbeddings - Count of permanent memories without embeddings
 * @returns response.error - Error message if status is 'error'
 *
 * @example
 * ```typescript
 * const result = await rebuildIndex({ basePath: '/home/user/.claude/memory' });
 *
 * if (result.status === 'success') {
 *   console.log(`Index rebuilt: ${result.entriesCount} entries`);
 *   console.log(`Orphans removed: ${result.orphansRemoved}`);
 *   console.log(`New entries: ${result.newEntriesAdded}`);
 *
 *   if (result.missingEmbeddings && result.missingEmbeddings > 0) {
 *     console.log(`Run 'memory refresh --embeddings' to generate ${result.missingEmbeddings} embeddings`);
 *   }
 * } else {
 *   console.error(`Rebuild failed: ${result.error}`);
 * }
 * ```
 */
export async function rebuildIndex(request: RebuildIndexRequest): Promise<RebuildIndexResponse> {
  const basePath = request.basePath ?? process.cwd();

  try {
    const existingIndex = await loadIndex({ basePath });
    const existingIds = new Set(existingIndex.memories.map(e => e.id));

    // Memory files are stored in permanent/ and temporary/ subdirectories
    const permanentDir = path.join(basePath, 'permanent');
    const temporaryDir = path.join(basePath, 'temporary');
    const files = [
      ...(await listMarkdownFiles(permanentDir)),
      ...(await listMarkdownFiles(temporaryDir)),
    ];
    const newEntries: IndexEntry[] = [];
    const foundIds = new Set<MemoryId>();

    let newEntriesAdded = 0;

    for (const filePath of files) {
      try {
        const content = await readFile(filePath);
        const { frontmatter } = parseMemoryFile(content);

        // Extract ID from filename and cast to MemoryId
        const filename = path.basename(filePath, '.md');
        const id = unsafeAsMemoryId(filename);

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

    await saveIndex(basePath, newIndex);

    log.info('Rebuilt index', {
      memories: newEntries.length,
      orphansRemoved,
      newEntriesAdded,
    });

    // Detect missing embeddings
    const cachePath = path.join(basePath, 'embeddings.json');
    let missingEmbeddings = 0;

    try {
      const cache = await loadEmbeddingCache(cachePath);

      for (const entry of newIndex.memories) {
        // Skip temporary/thought memories (they're ephemeral)
        if (entry.id.startsWith('thought-') || entry.relativePath?.includes('temporary/')) {
          continue;
        }

        if (!cache.memories[entry.id]) {
          missingEmbeddings++;
        }
      }
    } catch (error) {
      // Cache doesn't exist or couldn't be read
      missingEmbeddings = newIndex.memories.filter(
        e => !e.id.startsWith('thought-') && !e.relativePath?.includes('temporary/')
      ).length;
    }

    if (missingEmbeddings > 0) {
      log.info('Detected memories without embeddings', {
        count: missingEmbeddings,
        suggestion: 'Run: memory refresh --embeddings'
      });
    }

    return {
      status: 'success',
      entriesCount: newEntries.length,
      orphansRemoved,
      newEntriesAdded,
      missingEmbeddings,
    };
  } catch (error) {
    log.error('Failed to rebuild index', { error: String(error) });
    return {
      status: 'error',
      error: `Failed to rebuild index: ${String(error)}`,
    };
  }
}
