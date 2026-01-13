/**
 * Property-based tests for similarity.ts
 *
 * Tests mathematical properties of cosine similarity that must hold for all inputs
 */

import { describe, it, expect } from 'vitest';
import { cosineSimilarity, findSimilarMemories, rankBySimilarity, averageKNearestSimilarity, findPotentialDuplicates } from './similarity.js';

describe('similarity property-based tests', () => {
  describe('cosineSimilarity mathematical properties', () => {
    it('should be symmetric: similarity(a,b) === similarity(b,a)', () => {
      const testCases = [
        [[1, 0, 0], [0, 1, 0]],
        [[1, 2, 3], [4, 5, 6]],
        [[0.5, 0.5], [0.8, 0.2]],
        [[1, 1, 1], [2, 2, 2]],
      ];

      for (const [vec1, vec2] of testCases) {
        const sim1 = cosineSimilarity(vec1, vec2);
        const sim2 = cosineSimilarity(vec2, vec1);
        expect(sim1).toBeCloseTo(sim2, 10);
      }
    });

    it('should return 1 for identical vectors', () => {
      const testVectors = [
        [1, 0, 0],
        [1, 2, 3],
        [0.5, 0.5, 0.5],
        [10, 20, 30, 40],
      ];

      for (const vec of testVectors) {
        const similarity = cosineSimilarity(vec, vec);
        expect(similarity).toBeCloseTo(1, 10);
      }
    });

    it('should return value in range [-1, 1]', () => {
      const testCases = [
        [[1, 0], [0, 1]],
        [[1, 2, 3], [4, 5, 6]],
        [[-1, -2], [1, 2]],
        [[100, 200], [300, 400]],
      ];

      for (const [vec1, vec2] of testCases) {
        const similarity = cosineSimilarity(vec1, vec2);
        expect(similarity).toBeGreaterThanOrEqual(-1);
        expect(similarity).toBeLessThanOrEqual(1);
      }
    });

    it('should return 0 for orthogonal vectors', () => {
      const orthogonalPairs = [
        [[1, 0, 0], [0, 1, 0]],
        [[1, 0], [0, 1]],
        [[1, 1, 0], [1, -1, 0]],
      ];

      for (const [vec1, vec2] of orthogonalPairs) {
        const similarity = cosineSimilarity(vec1, vec2);
        expect(Math.abs(similarity)).toBeLessThan(0.0001);
      }
    });

    it('should be scale invariant: sim(v, w) === sim(k*v, w) for k > 0', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [4, 5, 6];
      const scales = [0.1, 2, 10, 100];

      const baseSimilarity = cosineSimilarity(vec1, vec2);

      for (const scale of scales) {
        const scaledVec1 = vec1.map(x => x * scale);
        const similarity = cosineSimilarity(scaledVec1, vec2);
        expect(similarity).toBeCloseTo(baseSimilarity, 10);
      }
    });

    it('should return -1 for opposite vectors', () => {
      const testCases = [
        [[1, 0], [-1, 0]],
        [[1, 2, 3], [-1, -2, -3]],
        [[5, 5, 5], [-5, -5, -5]],
      ];

      for (const [vec1, vec2] of testCases) {
        const similarity = cosineSimilarity(vec1, vec2);
        expect(similarity).toBeCloseTo(-1, 10);
      }
    });

    it('should return 0 for zero vectors', () => {
      const vec1 = [1, 2, 3];
      const zeroVec = [0, 0, 0];

      const similarity = cosineSimilarity(vec1, zeroVec);
      expect(similarity).toBe(0);
    });

    it('should handle vectors with negative values', () => {
      const testCases = [
        [[-1, -2, -3], [1, 2, 3]],
        [[-5, 10], [5, -10]],
        [[-1, -1], [-2, -2]],
      ];

      for (const [vec1, vec2] of testCases) {
        const similarity = cosineSimilarity(vec1, vec2);
        expect(similarity).toBeGreaterThanOrEqual(-1);
        expect(similarity).toBeLessThanOrEqual(1);
      }
    });

    it('should throw error for empty vectors', () => {
      expect(() => cosineSimilarity([], [])).toThrow('Vectors cannot be empty');
    });

    it('should throw error for mismatched vector lengths', () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('Vectors must have same length');
    });
  });

  describe('findSimilarMemories properties', () => {
    it('should return results sorted by similarity descending', () => {
      const queryEmbedding = [1, 0, 0];
      const embeddings = {
        'a': [0.9, 0.1, 0],
        'b': [0.5, 0.5, 0],
        'c': [1, 0, 0],
        'd': [0, 1, 0],
      };

      const results = findSimilarMemories(queryEmbedding, embeddings);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it('should respect threshold parameter', () => {
      const queryEmbedding = [1, 0, 0];
      const embeddings = {
        'high': [0.9, 0.1, 0],
        'medium': [0.6, 0.4, 0],
        'low': [0.3, 0.7, 0],
      };
      const threshold = 0.7;

      const results = findSimilarMemories(queryEmbedding, embeddings, threshold);

      for (const result of results) {
        expect(result.similarity).toBeGreaterThanOrEqual(threshold);
      }
    });

    it('should respect limit parameter', () => {
      const queryEmbedding = [1, 0, 0];
      const embeddings = {
        'a': [0.9, 0, 0],
        'b': [0.8, 0, 0],
        'c': [0.7, 0, 0],
        'd': [0.6, 0, 0],
        'e': [0.5, 0, 0],
      };
      const limit = 3;

      const results = findSimilarMemories(queryEmbedding, embeddings, 0, limit);

      expect(results).toHaveLength(limit);
    });

    it('should exclude specified ID', () => {
      const queryEmbedding = [1, 0, 0];
      const embeddings = {
        'self': [1, 0, 0],
        'other': [0.9, 0, 0],
      };

      const results = findSimilarMemories(queryEmbedding, embeddings, 0, undefined, 'self');

      expect(results.find(r => r.id === 'self')).toBeUndefined();
    });

    it('should never return negative similarities when threshold is 0', () => {
      const queryEmbedding = [1, 0, 0];
      const embeddings = {
        'opposite': [-1, 0, 0],
        'orthogonal': [0, 1, 0],
        'similar': [0.9, 0, 0],
      };

      const results = findSimilarMemories(queryEmbedding, embeddings, 0);

      for (const result of results) {
        expect(result.similarity).toBeGreaterThanOrEqual(-1);
        expect(result.similarity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('rankBySimilarity properties', () => {
    it('should return results in descending similarity order', () => {
      const queryEmbedding = [1, 0, 0];
      const candidates = [
        { id: 'a', embedding: [0.5, 0.5, 0] },
        { id: 'b', embedding: [0.9, 0.1, 0] },
        { id: 'c', embedding: [0.3, 0.7, 0] },
      ];

      const results = rankBySimilarity(queryEmbedding, candidates);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it('should preserve all candidate properties', () => {
      const queryEmbedding = [1, 0, 0];
      const candidates = [
        { id: 'a', embedding: [1, 0, 0], metadata: 'test' },
        { id: 'b', embedding: [0, 1, 0], extra: 123 },
      ];

      const results = rankBySimilarity(queryEmbedding, candidates);

      expect(results[0]).toHaveProperty('metadata');
      expect(results[1]).toHaveProperty('extra');
    });

    it('should return empty array for empty input', () => {
      const queryEmbedding = [1, 0, 0];
      const results = rankBySimilarity(queryEmbedding, []);

      expect(results).toEqual([]);
    });
  });

  describe('averageKNearestSimilarity properties', () => {
    it('should return value in range [0, 1] for positive similarities', () => {
      const embeddings = {
        'target': [1, 0, 0],
        'a': [0.9, 0, 0],
        'b': [0.8, 0, 0],
        'c': [0.7, 0, 0],
      };

      const avg = averageKNearestSimilarity('target', embeddings, 3);

      expect(avg).toBeGreaterThanOrEqual(0);
      expect(avg).toBeLessThanOrEqual(1);
    });

    it('should return 0 when target not found', () => {
      const embeddings = {
        'a': [1, 0, 0],
        'b': [0, 1, 0],
      };

      const avg = averageKNearestSimilarity('nonexistent', embeddings, 2);

      expect(avg).toBe(0);
    });

    it('should exclude self from nearest neighbours', () => {
      const embeddings = {
        'target': [1, 0, 0],
        'different1': [0.7, 0.7, 0],  // ~0.7 similarity
        'different2': [0.5, 0.5, 0.7], // different direction
      };

      const avg = averageKNearestSimilarity('target', embeddings, 2);

      // Should not include perfect self-similarity of 1.0
      // With different directions, average should be less than 1
      expect(avg).toBeLessThan(1);
    });

    it('should return 0 when no other embeddings exist', () => {
      const embeddings = {
        'only': [1, 0, 0],
      };

      const avg = averageKNearestSimilarity('only', embeddings, 5);

      expect(avg).toBe(0);
    });
  });

  describe('findPotentialDuplicates properties', () => {
    it('should return pairs sorted by similarity descending', () => {
      const embeddings = {
        'a': [1, 0, 0],
        'b': [0.99, 0, 0],
        'c': [0.95, 0, 0],
        'd': [0.90, 0, 0],
      };

      const duplicates = findPotentialDuplicates(embeddings, 0.8);

      for (let i = 1; i < duplicates.length; i++) {
        expect(duplicates[i - 1].similarity).toBeGreaterThanOrEqual(duplicates[i].similarity);
      }
    });

    it('should respect threshold parameter', () => {
      const embeddings = {
        'a': [1, 0, 0],
        'b': [0.95, 0, 0],
        'c': [0.85, 0, 0],
      };
      const threshold = 0.9;

      const duplicates = findPotentialDuplicates(embeddings, threshold);

      for (const dup of duplicates) {
        expect(dup.similarity).toBeGreaterThanOrEqual(threshold);
      }
    });

    it('should never include duplicate pairs (a,b) and (b,a)', () => {
      const embeddings = {
        'a': [1, 0, 0],
        'b': [0.95, 0, 0],
        'c': [0.94, 0, 0],
      };

      const duplicates = findPotentialDuplicates(embeddings, 0.9);
      const pairSet = new Set<string>();

      for (const { id1, id2 } of duplicates) {
        const normalizedPair = [id1, id2].sort().join(',');
        expect(pairSet.has(normalizedPair)).toBe(false);
        pairSet.add(normalizedPair);
      }
    });

    it('should return empty array when no duplicates above threshold', () => {
      const embeddings = {
        'a': [1, 0, 0],
        'b': [0, 1, 0],
        'c': [0, 0, 1],
      };

      const duplicates = findPotentialDuplicates(embeddings, 0.9);

      expect(duplicates).toHaveLength(0);
    });
  });

  describe('numerical stability', () => {
    it('should handle very small values', () => {
      const vec1 = [0.0001, 0.0002, 0.0003];
      const vec2 = [0.0001, 0.0002, 0.0003];

      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should handle very large values', () => {
      const vec1 = [1e10, 2e10, 3e10];
      const vec2 = [1e10, 2e10, 3e10];

      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should handle mixed magnitude vectors', () => {
      const vec1 = [1, 1000, 0.001];
      const vec2 = [0.001, 1000, 1];

      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
      expect(isNaN(similarity)).toBe(false);
      expect(isFinite(similarity)).toBe(true);
    });
  });
});
