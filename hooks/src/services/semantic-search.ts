/**
 * Semantic Memory Search for Claude Code Hooks
 *
 * TypeScript port of semantic-memory-search.py
 * Uses ollama-js for embeddings and pure TypeScript for cosine similarity.
 */

import { readFile, writeFile, mkdir, stat, readdir, unlink, utimes } from 'fs/promises';
import { createHash } from 'crypto';
import { join } from 'path';
import { homedir } from 'os';
import { embed } from './ollama.ts';

// Configuration
const EMBEDDING_MODEL = 'embeddinggemma:latest';

// Tiered thresholds (calibrated for embeddinggemma scores ~0.3-0.6 range)
// Exact topic match typically scores ~0.55-0.60, related ~0.45-0.50
const THRESHOLDS: Record<string, number> = {
  session_start: 0.4,
  user_prompt_first: 0.45,
  user_prompt: 0.55,
  post_tool_use: 0.5,
};

// Cache directories
const SEMANTIC_INDEX_DIR = join(homedir(), '.claude', 'cache', 'semantic-index');
const QUERY_CACHE_DIR = join(homedir(), '.claude', 'cache', 'embeddings');

// LRU cache eviction settings
const MAX_QUERY_CACHE_ENTRIES = 1000;

/**
 * Result from a memory search
 */
export interface MemoryResult {
  id: string;
  title: string;
  score: number;
  type: string;
  file: string;
  scope?: string;
}

/**
 * Search result with metadata
 */
export interface SearchResult {
  memories: MemoryResult[];
  index_status: 'indexed' | 'fallback' | 'no_embedding';
  search_time_ms: number;
  threshold_used: number;
  query_length?: number;
}

/**
 * Index data structure
 */
interface IndexData {
  embeddings: number[][];
  memory_ids: string[];
}

/**
 * Manifest data structure
 */
interface ManifestData {
  memories: Record<
    string,
    {
      title?: string;
      file?: string;
      tags?: string[];
    }
  >;
}

/**
 * Graph data structure
 */
interface GraphData {
  nodes: Record<
    string,
    {
      type?: string;
      links?: string[];
    }
  >;
}

/**
 * Pure TypeScript cosine similarity.
 * For 768-dim vectors, this is fast enough without NumPy.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

/**
 * Load embedding from cache.
 * Touches the file on hit to update mtime for LRU eviction.
 */
export async function loadEmbeddingCache(
  cacheDir: string,
  cacheKey: string
): Promise<number[] | null> {
  const cacheFile = join(cacheDir, `${cacheKey}.json`);

  try {
    const content = await readFile(cacheFile, 'utf-8');
    const cached = JSON.parse(content);
    if (Array.isArray(cached) && cached.length > 0) {
      // Touch file to update mtime (LRU tracking)
      const now = new Date();
      await utimes(cacheFile, now, now).catch(() => {});
      return cached;
    }
  } catch {
    // File doesn't exist or cache corrupted
  }

  return null;
}

/**
 * Save embedding to cache.
 */
export async function saveEmbeddingCache(
  cacheDir: string,
  cacheKey: string,
  embedding: number[]
): Promise<void> {
  try {
    await mkdir(cacheDir, { recursive: true });
    const cacheFile = join(cacheDir, `${cacheKey}.json`);
    await writeFile(cacheFile, JSON.stringify(embedding));
  } catch {
    // Cache write failed
  }
}

/**
 * Evict oldest cache entries when limit exceeded (LRU policy).
 * Uses file mtime as access proxy - files are rewritten on cache hit.
 */
export async function evictOldCacheEntries(
  cacheDir: string,
  maxEntries: number = MAX_QUERY_CACHE_ENTRIES
): Promise<number> {
  try {
    const files = await readdir(cacheDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    if (jsonFiles.length <= maxEntries) {
      return 0; // No eviction needed
    }

    // Get file stats for sorting by mtime
    const fileStats = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = join(cacheDir, file);
        try {
          const stats = await stat(filePath);
          return { file, filePath, mtime: stats.mtimeMs };
        } catch {
          return { file, filePath, mtime: 0 }; // Treat errors as oldest
        }
      })
    );

    // Sort by mtime ascending (oldest first)
    fileStats.sort((a, b) => a.mtime - b.mtime);

    // Evict oldest entries to get under limit
    const toEvict = fileStats.slice(0, jsonFiles.length - maxEntries);
    let evicted = 0;

    for (const { filePath } of toEvict) {
      try {
        await unlink(filePath);
        evicted++;
      } catch {
        // File already deleted or inaccessible
      }
    }

    return evicted;
  } catch {
    return 0; // Cache dir doesn't exist or inaccessible
  }
}

/**
 * Get cached query embedding or generate a new one.
 */
export async function getQueryEmbedding(query: string): Promise<number[] | null> {
  const cacheKey = createHash('sha256').update(query).digest('hex');

  // Check cache first
  const cached = await loadEmbeddingCache(QUERY_CACHE_DIR, cacheKey);
  if (cached) {
    return cached;
  }

  // Generate new embedding using ollama-js
  const embedding = await embed(query, EMBEDDING_MODEL);

  if (embedding.length > 0) {
    await saveEmbeddingCache(QUERY_CACHE_DIR, cacheKey, embedding);
    // Fire-and-forget eviction to avoid blocking
    evictOldCacheEntries(QUERY_CACHE_DIR).catch(() => {});
    return embedding;
  }

  return null;
}

/**
 * Load links for a memory from graph.json.
 */
export async function loadGraphLinks(projectDir: string, memoryId: string): Promise<string[]> {
  const graphFile = join(projectDir, '.claude', 'memory', 'graph.json');

  try {
    const content = await readFile(graphFile, 'utf-8');
    const graph: GraphData = JSON.parse(content);
    const node = graph.nodes?.[memoryId];
    return node?.links || [];
  } catch {
    return [];
  }
}

/**
 * Check if the semantic index is stale (memories newer than index).
 */
export async function isIndexStale(projectDir: string, scope: string): Promise<boolean> {
  const indexDir =
    scope === 'local'
      ? join(projectDir, '.claude', 'cache', 'semantic-index')
      : SEMANTIC_INDEX_DIR;

  const indexFile = join(indexDir, `${scope}-index.json`);
  const memoryDir =
    scope === 'local'
      ? join(projectDir, '.claude', 'memory')
      : join(homedir(), '.claude', 'memory');

  try {
    // If no index exists, consider it stale
    const indexStat = await stat(indexFile);
    const indexMtime = indexStat.mtimeMs;

    // Check if memory directory exists
    try {
      await stat(memoryDir);
    } catch {
      // No memory directory, index is fine
      return false;
    }

    // Check if any memory file is newer than the index
    const files = await readdir(memoryDir, { recursive: true });
    for (const file of files) {
      if (typeof file !== 'string' || !file.endsWith('.md')) continue;

      const filePath = join(memoryDir, file);
      try {
        const fileStat = await stat(filePath);
        if (fileStat.mtimeMs > indexMtime) {
          return true; // Found a newer memory
        }
      } catch {
        // Ignore stat errors
      }
    }

    return false; // All memories are older than index
  } catch {
    return true; // No index or error checking, assume stale
  }
}

/**
 * Load pre-computed index for a scope.
 */
async function loadIndex(
  scope: string,
  projectDir?: string
): Promise<{ embeddings: number[][]; ids: string[]; manifest: ManifestData } | null> {
  const indexDir =
    scope === 'local' && projectDir
      ? join(projectDir, '.claude', 'cache', 'semantic-index')
      : SEMANTIC_INDEX_DIR;

  const indexFile = join(indexDir, `${scope}-index.json`);
  const manifestFile = join(indexDir, `${scope}-manifest.json`);

  try {
    const [indexContent, manifestContent] = await Promise.all([
      readFile(indexFile, 'utf-8'),
      readFile(manifestFile, 'utf-8'),
    ]);

    const indexData: IndexData = JSON.parse(indexContent);
    const manifest: ManifestData = JSON.parse(manifestContent);

    return {
      embeddings: indexData.embeddings || [],
      ids: indexData.memory_ids || [],
      manifest,
    };
  } catch {
    return null;
  }
}

/**
 * Search memories using pre-computed index.
 */
function searchWithIndex(
  queryEmbedding: number[],
  embeddings: number[][],
  memoryIds: string[],
  manifest: ManifestData,
  threshold: number,
  limit: number
): MemoryResult[] {
  const results: MemoryResult[] = [];

  for (let i = 0; i < embeddings.length; i++) {
    const embedding = embeddings[i];
    if (!embedding) continue;
    const score = cosineSimilarity(queryEmbedding, embedding);

    if (score >= threshold) {
      const memId = memoryIds[i];
      if (!memId) continue;
      const memInfo = manifest.memories?.[memId] || {};

      const memIdParts = memId.split('-');
      const type = memIdParts[0] || 'unknown';

      results.push({
        id: memId,
        title: memInfo.title || memId,
        score: Math.round(score * 10000) / 10000,
        type,
        file: memInfo.file || '',
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/**
 * Fallback search: iterate through memory files when index is stale.
 */
async function searchFallback(
  _query: string,
  queryEmbedding: number[],
  memoryDir: string,
  threshold: number,
  limit: number
): Promise<MemoryResult[]> {
  const results: MemoryResult[] = [];

  try {
    // Check if directory exists
    await stat(memoryDir);
    const files = await readdir(memoryDir, { recursive: true });

    for (const file of files) {
      if (typeof file !== 'string' || !file.endsWith('.md')) continue;

      const filePath = join(memoryDir, file);
      try {
        const content = await readFile(filePath, 'utf-8');

        // Extract title from first heading
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch?.[1] || file;

        // Get embedding for this memory
        const memoryEmbedding = await embed(
          content.slice(0, 1000),
          EMBEDDING_MODEL
        );

        if (memoryEmbedding.length === 0) continue;

        const score = cosineSimilarity(queryEmbedding, memoryEmbedding);

        if (score >= threshold) {
          const memId = file.replace(/\.md$/, '').replace(/\//g, '-');
          const memIdParts = memId.split('-');
          const type = memIdParts[0] || 'unknown';

          results.push({
            id: memId,
            title,
            score: Math.round(score * 10000) / 10000,
            type,
            file: filePath,
          });
        }
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Directory doesn't exist or read error
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/**
 * Select appropriate threshold based on hook type.
 */
function selectThreshold(hookType: string, explicitThreshold?: number): number {
  if (explicitThreshold !== undefined) {
    return explicitThreshold;
  }

  return THRESHOLDS[hookType] ?? THRESHOLDS.post_tool_use ?? 0.5;
}

/**
 * Main search function - searches memory by semantic similarity.
 *
 * @param query - Search query text
 * @param scope - 'local', 'global', or 'both'
 * @param projectDir - Project directory for local scope
 * @param hookType - Hook type for threshold selection
 * @param sessionId - Session ID (unused for now, kept for API compat)
 * @param limit - Maximum results to return
 * @param explicitThreshold - Override automatic threshold selection
 */
export async function searchMemories(
  query: string,
  scope: 'local' | 'global' | 'both',
  projectDir: string | undefined,
  hookType: string,
  _sessionId: string,
  limit: number = 5,
  explicitThreshold?: number
): Promise<SearchResult> {
  const startTime = Date.now();

  // Select threshold based on hook type
  const threshold = selectThreshold(hookType, explicitThreshold);

  // Get query embedding
  const queryEmbedding = await getQueryEmbedding(query);

  if (!queryEmbedding) {
    return {
      memories: [],
      index_status: 'no_embedding',
      search_time_ms: 0,
      threshold_used: threshold,
    };
  }

  const allResults: MemoryResult[] = [];
  let indexStatus: 'indexed' | 'fallback' = 'fallback';

  // Determine which scopes to search
  const scopesToSearch = scope === 'both' ? ['local', 'global'] : [scope];

  for (const s of scopesToSearch) {
    const memoryDir =
      s === 'local' && projectDir
        ? join(projectDir, '.claude', 'memory')
        : join(homedir(), '.claude', 'memory');

    // Check for index staleness
    const stale = await isIndexStale(projectDir || homedir(), s);

    if (!stale) {
      // Try indexed search
      const index = await loadIndex(s, s === 'local' ? projectDir : undefined);

      if (index && index.embeddings.length > 0) {
        indexStatus = 'indexed';

        const results = searchWithIndex(
          queryEmbedding,
          index.embeddings,
          index.ids,
          index.manifest,
          threshold,
          limit
        );

        // Tag results with scope
        for (const r of results) {
          r.scope = s;
        }

        allResults.push(...results);
        continue;
      }
    }

    // Fallback: iterate through files
    // Note: This is slow and should only be used when index is stale
    // For hooks, we skip fallback to maintain performance
    // Fallback is only used for explicit searches
    if (hookType === 'explicit_search') {
      const fallbackResults = await searchFallback(
        query,
        queryEmbedding,
        memoryDir,
        threshold,
        limit
      );

      for (const r of fallbackResults) {
        r.scope = s;
      }

      allResults.push(...fallbackResults);
    }
  }

  // Sort combined results: local first, then by score
  allResults.sort((a, b) => {
    // Prioritise local scope
    if (a.scope === 'local' && b.scope !== 'local') return -1;
    if (b.scope === 'local' && a.scope !== 'local') return 1;
    // Then by score
    return b.score - a.score;
  });

  return {
    memories: allResults.slice(0, limit),
    index_status: indexStatus,
    search_time_ms: Date.now() - startTime,
    threshold_used: threshold,
    query_length: query.length,
  };
}

/**
 * Performance logging helper.
 */
export function logSearchPerformance(result: SearchResult, query: string): void {
  const status = result.index_status === 'indexed' ? '✓' : '⚠';
  console.error(
    `[SemanticSearch] ${status} ${result.search_time_ms}ms | ` +
      `${result.memories.length} results | threshold=${result.threshold_used} | ` +
      `query="${query.slice(0, 30)}..."`
  );
}
