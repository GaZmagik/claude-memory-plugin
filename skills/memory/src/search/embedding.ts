/**
 * T061: Embedding Generation
 *
 * Generate and cache embeddings for semantic search.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { createLogger } from '../core/logger.js';

const log = createLogger('embedding');

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
  if (!fs.existsSync(cachePath)) {
    return { version: 1, memories: {} };
  }

  try {
    const content = fs.readFileSync(cachePath, 'utf-8');
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
  const dir = path.dirname(cachePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  log.debug('Saved embedding cache', { path: cachePath, memories: Object.keys(cache.memories).length });
}

/**
 * Get embedding for a memory, using cache if available
 */
export async function getEmbeddingForMemory(
  memoryId: string,
  content: string,
  cachePath: string,
  provider: EmbeddingProvider,
  contentHash?: string
): Promise<number[]> {
  const cache = await loadEmbeddingCache(cachePath);
  const hash = contentHash ?? generateContentHash(content);

  // Check cache
  const cached = cache.memories[memoryId];
  if (cached && cached.hash === hash) {
    log.debug('Using cached embedding', { memoryId });
    return cached.embedding;
  }

  // Generate new embedding
  log.debug('Generating new embedding', { memoryId });
  const embedding = await generateEmbedding(content, provider);

  // Update cache
  cache.memories[memoryId] = {
    embedding,
    hash,
    timestamp: new Date().toISOString(),
  };
  await saveEmbeddingCache(cachePath, cache);

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

  for (let i = 0; i < memories.length; i++) {
    const memory = memories[i];
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
        embedding.push((hash[i % hash.length] - 128) / 128);
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
