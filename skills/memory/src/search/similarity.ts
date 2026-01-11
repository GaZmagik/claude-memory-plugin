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
    dotProduct += vec1[i] * vec2[i];
    magnitude1 += vec1[i] * vec1[i];
    magnitude2 += vec2[i] * vec2[i];
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
 * Find potential duplicates based on high similarity
 *
 * @param embeddings - Map of memory ID to embedding
 * @param threshold - Minimum similarity to consider duplicate (default: 0.92)
 * @returns Array of potential duplicate pairs
 */
export function findPotentialDuplicates(
  embeddings: Record<string, number[]>,
  threshold: number = 0.92
): Array<{ id1: string; id2: string; similarity: number }> {
  const duplicates: Array<{ id1: string; id2: string; similarity: number }> = [];
  const ids = Object.keys(embeddings);

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const similarity = cosineSimilarity(embeddings[ids[i]], embeddings[ids[j]]);
      if (similarity >= threshold) {
        duplicates.push({
          id1: ids[i],
          id2: ids[j],
          similarity,
        });
      }
    }
  }

  // Sort by similarity descending
  duplicates.sort((a, b) => b.similarity - a.similarity);

  return duplicates;
}
