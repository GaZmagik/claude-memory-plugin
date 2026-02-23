/**
 * Embeddings Cache - Load and save the embeddings cache
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { EmbeddingCache } from '../../search/embedding.js';

/**
 * Load or create embeddings cache
 */
export function loadEmbeddingsCache(basePath: string): EmbeddingCache {
  const cachePath = path.join(basePath, 'embeddings.json');
  if (!fs.existsSync(cachePath)) {
    return { version: 1, memories: {} };
  }

  try {
    const content = fs.readFileSync(cachePath, 'utf-8');
    const cache = JSON.parse(content) as EmbeddingCache;
    // Ensure memories property exists
    if (!cache.memories) {
      cache.memories = {};
    }
    return cache;
  } catch {
    return { version: 1, memories: {} };
  }
}

/**
 * Save embeddings cache
 */
export function saveEmbeddingsCache(basePath: string, cache: EmbeddingCache): void {
  const cachePath = path.join(basePath, 'embeddings.json');
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}
