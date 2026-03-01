/**
 * T061: Embedding Generation
 *
 * Generate and cache embeddings for semantic search.
 */

import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { createLogger } from '../core/logger.js';
import { writeFileAtomic } from '../core/fs-utils.js';

const log = createLogger('embedding');

/**
 * Timeout for Ollama health check in milliseconds
 * Fast failure to avoid 30-second default timeout
 */
const OLLAMA_HEALTH_CHECK_TIMEOUT_MS = 2000;

/**
 * Blocklist for Ollama base URLs to prevent SSRF attacks
 * Blocks cloud metadata endpoints and localhost IP (use 'localhost' string instead)
 */
const OLLAMA_URL_BLOCKLIST = [
  '169.254.169.254',      // AWS metadata
  'metadata.google.internal', // GCP metadata
  'fd00::',               // Azure metadata (IPv6)
  '127.0.0.1',            // Localhost IP (use 'localhost' instead)
  '0.0.0.0',              // Wildcard/unspecified address
  '::1',                  // IPv6 loopback
  '[::1]',                // IPv6 loopback (bracket notation)
  'fe80::',               // Link-local IPv6
];

/**
 * Validate Ollama base URL to prevent SSRF attacks
 *
 * @param baseUrl - The Ollama API base URL to validate
 * @throws Error if URL is invalid, uses blocked hostname, or non-http/https protocol
 */
function validateOllamaUrl(baseUrl: string): void {
  try {
    const url = new URL(baseUrl);

    // Check against blocklist
    // Known limitation: alternate IPv4 representations (decimal 2130706433,
    // octal 0177.0.0.1) can bypass hostname string matching. For a local
    // developer tool this is acceptable; production use would need DNS resolution.
    if (OLLAMA_URL_BLOCKLIST.some(blocked => url.hostname.includes(blocked))) {
      throw new Error(
        `Ollama base URL must not point to cloud metadata services or blocked hosts: ${url.hostname}`
      );
    }

    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Ollama base URL must use http or https protocol, got: ${url.protocol}`);
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid Ollama base URL: ${baseUrl}`);
    }
    throw error;
  }
}

/**
 * Embedding provider interface
 */
export interface EmbeddingProvider {
  name: string;
  generate: (text: string) => Promise<number[]>;
}

/**
 * Cached embedding entry
 */
export interface EmbeddingCacheEntry {
  embedding: number[];
  hash: string;
  timestamp: string;
}

/**
 * Embedding cache structure
 */
export interface EmbeddingCache {
  version: number;
  memories: Record<string, EmbeddingCacheEntry>;
}

/**
 * Normalise a vector to unit length
 */
function normalise(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) {
    return vector;
  }
  return vector.map(val => val / magnitude);
}

/**
 * Generate content hash for cache invalidation
 */
export function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Generate embedding for text
 */
export async function generateEmbedding(
  text: string,
  provider: EmbeddingProvider
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  const embedding = await provider.generate(text);
  return normalise(embedding);
}

/**
 * Load embedding cache from file
 */
export async function loadEmbeddingCache(cachePath: string): Promise<EmbeddingCache> {
  try {
    await fsp.access(cachePath);
  } catch {
    return { version: 1, memories: {} };
  }

  try {
    const content = await fsp.readFile(cachePath, 'utf-8');
    return JSON.parse(content) as EmbeddingCache;
  } catch {
    log.warn('Failed to load embedding cache, starting fresh', { path: cachePath });
    return { version: 1, memories: {} };
  }
}

/**
 * Save embedding cache to file
 */
export async function saveEmbeddingCache(
  cachePath: string,
  cache: EmbeddingCache
): Promise<void> {
  // Use atomic write to prevent cache corruption during concurrent writes
  // writeFileAtomic handles directory creation internally
  await writeFileAtomic(cachePath, JSON.stringify(cache, null, 2));
  log.debug('Saved embedding cache', { path: cachePath, memories: Object.keys(cache.memories).length });
}

/**
 * Get embedding for a memory, using cache if available
 *
 * When an optional `cache` parameter is provided, it is used directly instead
 * of loading from disk, and the caller is responsible for saving afterwards.
 * This avoids redundant load/save cycles when processing multiple memories.
 */
export async function getEmbeddingForMemory(
  memoryId: string,
  content: string,
  cachePath: string,
  provider: EmbeddingProvider,
  contentHash?: string,
  cache?: EmbeddingCache
): Promise<number[]> {
  const callerOwnsCache = cache !== undefined;
  const effectiveCache = cache ?? await loadEmbeddingCache(cachePath);
  const hash = contentHash ?? generateContentHash(content);

  // Check cache
  const cached = effectiveCache.memories[memoryId];
  if (cached && cached.hash === hash) {
    log.debug('Using cached embedding', { memoryId });
    return cached.embedding;
  }

  // Generate new embedding
  log.debug('Generating new embedding', { memoryId });
  const embedding = await generateEmbedding(content, provider);

  // Update cache entry
  effectiveCache.memories[memoryId] = {
    embedding,
    hash,
    timestamp: new Date().toISOString(),
  };

  // Only persist when the caller has not provided the cache (they save once themselves)
  if (!callerOwnsCache) {
    await saveEmbeddingCache(cachePath, effectiveCache);
  }

  return embedding;
}

/**
 * Memory info for batch embedding
 */
interface MemoryForEmbedding {
  id: string;
  content: string;
  hash?: string;
}

/**
 * Batch embedding result
 */
interface BatchEmbeddingResult {
  id: string;
  embedding: number[];
  fromCache: boolean;
}

/**
 * Progress callback type
 */
type ProgressCallback = (current: number, total: number) => void;

/**
 * Generate embeddings for multiple memories
 */
export async function batchGenerateEmbeddings(
  memories: MemoryForEmbedding[],
  basePath: string,
  provider: EmbeddingProvider,
  onProgress?: ProgressCallback
): Promise<BatchEmbeddingResult[]> {
  const cachePath = path.join(basePath, 'embeddings.json');
  const cache = await loadEmbeddingCache(cachePath);
  const results: BatchEmbeddingResult[] = [];

  // Sequential (not parallel) — avoids Ollama rate limits and keeps cache writes atomic
  for (let i = 0; i < memories.length; i++) {
    const memory = memories[i];
    if (!memory) continue;
    const hash = memory.hash ?? generateContentHash(memory.content);

    // Check cache
    const cached = cache.memories[memory.id];
    if (cached && cached.hash === hash) {
      results.push({
        id: memory.id,
        embedding: cached.embedding,
        fromCache: true,
      });
    } else {
      // Generate new embedding
      const embedding = await generateEmbedding(memory.content, provider);
      cache.memories[memory.id] = {
        embedding,
        hash,
        timestamp: new Date().toISOString(),
      };
      results.push({
        id: memory.id,
        embedding,
        fromCache: false,
      });
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, memories.length);
    }
  }

  // Save updated cache
  await saveEmbeddingCache(cachePath, cache);

  log.info('Batch embedding complete', {
    total: memories.length,
    cached: results.filter(r => r.fromCache).length,
    generated: results.filter(r => !r.fromCache).length,
  });

  return results;
}

/**
 * Create a mock embedding provider for testing
 */
export function createMockProvider(dimension: number = 384): EmbeddingProvider {
  return {
    name: 'mock',
    generate: async (text: string) => {
      // Generate deterministic embedding based on text hash
      const hash = crypto.createHash('sha256').update(text).digest();
      const embedding: number[] = [];
      for (let i = 0; i < dimension; i++) {
        const hashValue = hash[i % hash.length];
        if (hashValue === undefined) continue;
        embedding.push((hashValue - 128) / 128);
      }
      return embedding;
    },
  };
}

/**
 * Maximum content length for embedding (in characters)
 * Embedding models typically have 2K-8K token limits.
 * Using 6000 chars (~1500 tokens) to leave headroom.
 */
const MAX_EMBEDDING_CONTENT_LENGTH = 6000;

/**
 * Truncate content for embedding if too long
 */
export function truncateForEmbedding(content: string): string {
  if (content.length <= MAX_EMBEDDING_CONTENT_LENGTH) {
    return content;
  }
  // Truncate at word boundary and add indicator
  const truncated = content.slice(0, MAX_EMBEDDING_CONTENT_LENGTH);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > MAX_EMBEDDING_CONTENT_LENGTH - 100
    ? truncated.slice(0, lastSpace)
    : truncated) + '...';
}

/**
 * Create Ollama embedding provider
 */
export function createOllamaProvider(
  model: string = 'embeddinggemma:latest',
  baseUrl: string = 'http://localhost:11434'
): EmbeddingProvider {
  // Validate URL before use (B4: SSRF prevention)
  validateOllamaUrl(baseUrl);

  return {
    name: `ollama:${model}`,
    generate: async (text: string) => {
      // Truncate long content to avoid exceeding model context length
      const truncatedText = truncateForEmbedding(text);

      const response = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: truncatedText }),
      });

      if (!response.ok) {
        // Parse actual error from Ollama response body
        let errorDetail = response.statusText;
        try {
          const errorBody = await response.json() as { error?: string };
          if (errorBody.error) {
            errorDetail = errorBody.error;
          }
        } catch {
          // Fall back to statusText if body parsing fails
        }
        throw new Error(`Ollama API error: ${errorDetail}`);
      }

      const data = (await response.json()) as { embedding: number[] };
      return data.embedding;
    },
  };
}

/**
 * Create Ollama provider with upfront health check to avoid timeouts
 * Returns undefined if Ollama is unavailable
 *
 * Model matching strategy:
 * Uses prefix matching for flexibility - 'embeddinggemma' will match
 * 'embeddinggemma:latest', 'embeddinggemma:v2', etc. This allows version
 * flexibility while ensuring the correct model family is available.
 *
 * @param model - Model name (e.g., 'embeddinggemma:latest')
 * @param baseUrl - Ollama API base URL
 * @returns EmbeddingProvider if available, undefined otherwise
 */
export async function createOllamaProviderWithHealthCheck(
  model: string = 'embeddinggemma:latest',
  baseUrl: string = 'http://localhost:11434'
): Promise<EmbeddingProvider | undefined> {
  // Validate URL before health check (B4: SSRF prevention)
  validateOllamaUrl(baseUrl);

  try {
    // Quick health check with fast timeout to avoid blocking
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(OLLAMA_HEALTH_CHECK_TIMEOUT_MS),
    });

    if (!response.ok) {
      return undefined;
    }

    // Parse and validate response structure
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      // Invalid JSON response
      return undefined;
    }

    // Validate response has expected structure
    if (!data || typeof data !== 'object' || !('models' in data)) {
      return undefined;
    }

    const apiResponse = data as { models?: unknown };
    if (!Array.isArray(apiResponse.models)) {
      return undefined;
    }

    // Extract model prefix (before ':') for flexible version matching
    const modelPrefix = model.split(':')[0] ?? '';
    const modelAvailable = apiResponse.models.some((m) => {
      // Validate each model entry has expected structure
      if (!m || typeof m !== 'object' || !('name' in m)) {
        return false;
      }
      const modelEntry = m as { name?: unknown };
      return typeof modelEntry.name === 'string' && modelEntry.name.includes(modelPrefix);
    });

    if (!modelAvailable) {
      return undefined;
    }

    // Health check passed, return provider
    return createOllamaProvider(model, baseUrl);
  } catch (error) {
    // Ollama unavailable - return undefined for graceful fallback
    return undefined;
  }
}
