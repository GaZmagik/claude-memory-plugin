/**
 * T062: Cosine Similarity Calculation
 *
 * Calculate similarity between embedding vectors.
 */

/**
 * Result from similarity search
 */
export interface SimilarityResult {
  id: string;
  similarity: number;
}

/**
 * Calculate cosine similarity between two vectors
 *
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @returns Cosine similarity (-1 to 1)
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length === 0 || vec2.length === 0) {
    throw new Error('Vectors cannot be empty');
  }

  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i]! * vec2[i]!;
    magnitude1 += vec1[i]! * vec1[i]!;
    magnitude2 += vec2[i]! * vec2[i]!;
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  // Handle zero vectors
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Find memories similar to a query embedding
 *
 * @param queryEmbedding - Query embedding vector
 * @param embeddings - Map of memory ID to embedding
 * @param threshold - Minimum similarity threshold (0-1)
 * @param limit - Maximum number of results
 * @param excludeId - Optional memory ID to exclude (for self-exclusion)
 * @returns Sorted array of similar memories
 */
export function findSimilarMemories(
  queryEmbedding: number[],
  embeddings: Record<string, number[]>,
  threshold: number = 0.5,
  limit?: number,
  excludeId?: string
): SimilarityResult[] {
  const results: SimilarityResult[] = [];

  for (const [id, embedding] of Object.entries(embeddings)) {
    // Skip excluded ID
    if (excludeId && id === excludeId) {
      continue;
    }

    const similarity = cosineSimilarity(queryEmbedding, embedding);

    if (similarity >= threshold) {
      results.push({ id, similarity });
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  // Apply limit
  if (limit !== undefined) {
    return results.slice(0, limit);
  }

  return results;
}

/**
 * Candidate memory for ranking
 */
interface RankCandidate {
  id: string;
  embedding: number[];
  [key: string]: unknown;
}

/**
 * Ranked result with similarity score
 */
interface RankedResult extends SimilarityResult {
  [key: string]: unknown;
}

/**
 * Rank memories by similarity to query
 *
 * @param queryEmbedding - Query embedding vector
 * @param candidates - Array of candidates with embeddings
 * @returns Sorted array with similarity scores
 */
export function rankBySimilarity(
  queryEmbedding: number[],
  candidates: RankCandidate[]
): RankedResult[] {
  if (candidates.length === 0) {
    return [];
  }

  const results: RankedResult[] = candidates.map(candidate => {
    const similarity = cosineSimilarity(queryEmbedding, candidate.embedding);
    return {
      ...candidate,
      similarity,
    };
  });

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return results;
}

/**
 * Calculate the average similarity of a memory to its k nearest neighbours
 *
 * @param targetId - Target memory ID
 * @param embeddings - Map of memory ID to embedding
 * @param k - Number of neighbours to consider
 * @returns Average similarity to k nearest neighbours
 */
export function averageKNearestSimilarity(
  targetId: string,
  embeddings: Record<string, number[]>,
  k: number = 5
): number {
  const targetEmbedding = embeddings[targetId];
  if (!targetEmbedding) {
    return 0;
  }

  const neighbours = findSimilarMemories(
    targetEmbedding,
    embeddings,
    0, // No threshold
    k,
    targetId // Exclude self
  );

  if (neighbours.length === 0) {
    return 0;
  }

  const sum = neighbours.reduce((acc, n) => acc + n.similarity, 0);
  return sum / neighbours.length;
}

/**
 * Fast dot product for normalised vectors (skips magnitude calculation)
 * For normalised vectors: cosine_similarity = dot_product
 */
function dotProduct(vec1: number[], vec2: number[]): number {
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    sum += vec1[i]! * vec2[i]!;
  }
  return sum;
}

// ============================================================================
// Locality-Sensitive Hashing (LSH) for O(n log n) duplicate detection
// ============================================================================

/**
 * Seeded random number generator for reproducible hyperplanes
 * Uses mulberry32 algorithm
 */
function seededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate random unit vector (hyperplane normal) with seeded RNG
 * Uses Box-Muller transform for normal distribution
 */
function randomHyperplane(dimensions: number, rng: () => number): number[] {
  const vec = new Array<number>(dimensions);
  let magnitude = 0;

  for (let i = 0; i < dimensions; i++) {
    // Box-Muller transform for normal distribution
    const u1 = rng();
    const u2 = rng();
    vec[i] = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
    magnitude += vec[i]! * vec[i]!;
  }

  // Normalise to unit vector
  magnitude = Math.sqrt(magnitude);
  for (let i = 0; i < dimensions; i++) {
    vec[i] = vec[i]! / magnitude;
  }

  return vec;
}

/**
 * Compute LSH hash for a vector using random hyperplanes
 * Each bit represents which side of the hyperplane the vector falls on
 */
function computeLSHHash(vec: number[], hyperplanes: number[][]): number {
  let hash = 0;
  for (let i = 0; i < hyperplanes.length; i++) {
    const hyperplane = hyperplanes[i];
    if (!hyperplane) continue;
    const dot = dotProduct(vec, hyperplane);
    if (dot >= 0) {
      hash |= 1 << i;
    }
  }
  return hash;
}

/**
 * LSH index for a single hash table
 */
interface LSHTable {
  hyperplanes: number[][];
  buckets: Map<number, string[]>;
}

/**
 * Build LSH index with multiple hash tables for better recall
 *
 * @param embeddings - Map of ID to embedding vector
 * @param numHashBits - Bits per hash (more = fewer false positives, more false negatives)
 * @param numTables - Number of hash tables (more = better recall, more memory)
 * @param seed - Random seed for reproducibility
 */
function buildLSHIndex(
  embeddings: Record<string, number[]>,
  numHashBits: number,
  numTables: number,
  seed: number = 42
): LSHTable[] {
  const ids = Object.keys(embeddings);
  if (ids.length === 0) return [];

  const firstId = ids[0];
  if (!firstId) return [];
  const firstEmbedding = embeddings[firstId];
  if (!firstEmbedding) return [];
  const dimensions = firstEmbedding.length;
  const tables: LSHTable[] = [];

  for (let t = 0; t < numTables; t++) {
    // Each table gets a different seed for different hyperplanes
    const rng = seededRandom(seed + t * 1000);

    // Generate random hyperplanes for this table
    const hyperplanes: number[][] = [];
    for (let h = 0; h < numHashBits; h++) {
      hyperplanes.push(randomHyperplane(dimensions, rng));
    }

    // Build buckets by hashing each embedding
    const buckets = new Map<number, string[]>();
    for (const id of ids) {
      const embedding = embeddings[id];
      if (!embedding) continue;
      const hash = computeLSHHash(embedding, hyperplanes);
      const bucket = buckets.get(hash);
      if (bucket) {
        bucket.push(id);
      } else {
        buckets.set(hash, [id]);
      }
    }

    tables.push({ hyperplanes, buckets });
  }

  return tables;
}

/**
 * Options for LSH-based duplicate detection
 */
export interface LSHOptions {
  /** Bits per hash (default: 10). More bits = fewer candidates, faster but may miss duplicates */
  numHashBits?: number;
  /** Number of hash tables (default: 6). More tables = better recall, more memory */
  numTables?: number;
  /** Random seed for reproducibility (default: 42) */
  seed?: number;
  /** Collection size threshold to switch from brute force to LSH (default: 200) */
  lshThreshold?: number;
}

/**
 * Find potential duplicates using brute force O(n²) comparison
 * Used internally for small collections where LSH overhead isn't worth it
 */
function findDuplicatesBruteForce(
  embeddings: Record<string, number[]>,
  threshold: number,
  limit?: number
): Array<{ id1: string; id2: string; similarity: number }> {
  const ids = Object.keys(embeddings);
  const n = ids.length;

  // Cache embeddings in array for faster access
  const embeddingArrays: number[][] = ids.map(id => embeddings[id]!);
  const duplicates: Array<{ id1: string; id2: string; similarity: number }> = [];

  for (let i = 0; i < n; i++) {
    const emb1 = embeddingArrays[i];
    if (!emb1) continue;

    for (let j = i + 1; j < n; j++) {
      const emb2 = embeddingArrays[j];
      if (!emb2) continue;
      const similarity = dotProduct(emb1, emb2);

      if (similarity >= threshold) {
        const id1 = ids[i];
        const id2 = ids[j];
        if (!id1 || !id2) continue;
        duplicates.push({ id1, id2, similarity });

        // Early termination if collecting extra candidates
        if (limit !== undefined && duplicates.length >= limit * 2) {
          break;
        }
      }
    }

    if (limit !== undefined && duplicates.length >= limit * 2) {
      break;
    }
  }

  duplicates.sort((a, b) => b.similarity - a.similarity);
  return limit !== undefined ? duplicates.slice(0, limit) : duplicates;
}

/**
 * Find potential duplicates using LSH for O(n × k) average complexity
 * where k is average bucket size (much smaller than n for sparse duplicates)
 */
function findDuplicatesLSH(
  embeddings: Record<string, number[]>,
  threshold: number,
  limit?: number,
  options?: LSHOptions
): Array<{ id1: string; id2: string; similarity: number }> {
  const numHashBits = options?.numHashBits ?? 10;
  const numTables = options?.numTables ?? 6;
  const seed = options?.seed ?? 42;

  // Build LSH index - O(n × numTables × numHashBits × dimensions)
  const tables = buildLSHIndex(embeddings, numHashBits, numTables, seed);

  // Collect candidate pairs from buckets - items in same bucket are candidates
  const candidatePairs = new Set<string>();

  for (const table of tables) {
    for (const bucket of table.buckets.values()) {
      if (bucket.length < 2) continue;

      // All pairs within a bucket are candidates
      for (let i = 0; i < bucket.length; i++) {
        const bucketI = bucket[i];
        if (!bucketI) continue;
        for (let j = i + 1; j < bucket.length; j++) {
          const bucketJ = bucket[j];
          if (!bucketJ) continue;
          // Canonical ordering for deduplication
          const [a, b] = bucketI < bucketJ
            ? [bucketI, bucketJ]
            : [bucketJ, bucketI];
          candidatePairs.add(`${a}\0${b}`);
        }
      }
    }
  }

  // Verify candidates with exact similarity - O(candidates × dimensions)
  const duplicates: Array<{ id1: string; id2: string; similarity: number }> = [];

  for (const pair of candidatePairs) {
    const [id1, id2] = pair.split('\0');
    if (!id1 || !id2) continue;
    const emb1 = embeddings[id1];
    const emb2 = embeddings[id2];
    if (!emb1 || !emb2) continue;
    const similarity = dotProduct(emb1, emb2);

    if (similarity >= threshold) {
      duplicates.push({ id1, id2, similarity });
    }
  }

  duplicates.sort((a, b) => b.similarity - a.similarity);
  return limit !== undefined ? duplicates.slice(0, limit) : duplicates;
}

/**
 * Find potential duplicates based on high similarity
 *
 * Automatically chooses between:
 * - Brute force O(n²) for small collections (< lshThreshold)
 * - LSH-based O(n × k) for large collections
 *
 * @param embeddings - Map of memory ID to embedding (must be normalised)
 * @param threshold - Minimum similarity to consider duplicate (default: 0.92)
 * @param limit - Maximum duplicates to find (default: unlimited)
 * @param options - LSH configuration options
 * @returns Array of potential duplicate pairs, sorted by similarity descending
 */
export function findPotentialDuplicates(
  embeddings: Record<string, number[]>,
  threshold: number = 0.92,
  limit?: number,
  options?: LSHOptions
): Array<{ id1: string; id2: string; similarity: number }> {
  const n = Object.keys(embeddings).length;

  if (n < 2) {
    return [];
  }

  // Use brute force for small collections, LSH for large ones
  const lshThreshold = options?.lshThreshold ?? 200;

  if (n < lshThreshold) {
    return findDuplicatesBruteForce(embeddings, threshold, limit);
  }

  return findDuplicatesLSH(embeddings, threshold, limit, options);
}
