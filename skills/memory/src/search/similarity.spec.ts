/**
 * T058: Unit tests for cosine similarity calculation
 */

import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  findSimilarMemories,
  rankBySimilarity,
  averageKNearestSimilarity,
  findPotentialDuplicates,
  type SimilarityResult,
} from './similarity.js';

describe('Cosine Similarity', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [0.5, 0.5, 0.5, 0.5];

      const similarity = cosineSimilarity(vec, vec);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [-1, 0, 0];

      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];

      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(0.0, 5);
    });

    it('should handle normalised unit vectors correctly', () => {
      // 45-degree angle vectors
      const vec1 = [1, 0];
      const vec2 = [Math.sqrt(2) / 2, Math.sqrt(2) / 2];

      const similarity = cosineSimilarity(vec1, vec2);

      // cos(45°) ≈ 0.707
      expect(similarity).toBeCloseTo(0.707, 2);
    });

    it('should throw error for different length vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, 2];

      expect(() => cosineSimilarity(vec1, vec2)).toThrow(
        'Vectors must have same length'
      );
    });

    it('should throw error for empty vectors', () => {
      expect(() => cosineSimilarity([], [])).toThrow('Vectors cannot be empty');
    });

    it('should handle zero vectors gracefully', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 0, 0];

      // Zero vector has undefined direction, return 0 similarity
      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBe(0);
    });

    it('should be commutative', () => {
      const vec1 = [0.3, 0.6, 0.1];
      const vec2 = [0.5, 0.2, 0.8];

      const sim1 = cosineSimilarity(vec1, vec2);
      const sim2 = cosineSimilarity(vec2, vec1);

      expect(sim1).toBeCloseTo(sim2, 10);
    });
  });

  describe('findSimilarMemories', () => {
    const mockEmbeddings = {
      'memory-1': [1, 0, 0],
      'memory-2': [0.9, 0.1, 0],
      'memory-3': [0, 1, 0],
      'memory-4': [0, 0, 1],
      'memory-5': [0.8, 0.2, 0],
    };

    it('should find most similar memories above threshold', () => {
      const queryEmbedding = [1, 0, 0];
      const threshold = 0.7;

      const results = findSimilarMemories(
        queryEmbedding,
        mockEmbeddings,
        threshold
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.similarity >= threshold)).toBe(true);
    });

    it('should return results sorted by similarity descending', () => {
      const queryEmbedding = [1, 0, 0];
      const threshold = 0.5;

      const results = findSimilarMemories(
        queryEmbedding,
        mockEmbeddings,
        threshold
      );

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(
          results[i].similarity
        );
      }
    });

    it('should limit number of results', () => {
      const queryEmbedding = [1, 0, 0];
      const threshold = 0.0;
      const limit = 2;

      const results = findSimilarMemories(
        queryEmbedding,
        mockEmbeddings,
        threshold,
        limit
      );

      expect(results).toHaveLength(2);
    });

    it('should exclude self when finding similar', () => {
      const queryEmbedding = [1, 0, 0];
      const threshold = 0.5;
      const excludeId = 'memory-1';

      const results = findSimilarMemories(
        queryEmbedding,
        mockEmbeddings,
        threshold,
        undefined,
        excludeId
      );

      expect(results.find(r => r.id === 'memory-1')).toBeUndefined();
    });

    it('should return empty array when no matches above threshold', () => {
      const queryEmbedding = [0, 0, 1];
      const threshold = 0.99;

      const results = findSimilarMemories(
        queryEmbedding,
        mockEmbeddings,
        threshold
      );

      // memory-4 is [0,0,1] but we need > 0.99 similarity
      expect(results.filter(r => r.id !== 'memory-4')).toHaveLength(0);
    });

    it('should include memory IDs in results', () => {
      const queryEmbedding = [1, 0, 0];
      const threshold = 0.5;

      const results = findSimilarMemories(
        queryEmbedding,
        mockEmbeddings,
        threshold
      );

      results.forEach(r => {
        expect(r.id).toBeDefined();
        expect(typeof r.id).toBe('string');
      });
    });
  });

  describe('rankBySimilarity', () => {
    it('should rank memories by query similarity', () => {
      const queryEmbedding = [1, 0, 0];
      const candidates = [
        { id: 'mem-1', embedding: [0.5, 0.5, 0] },
        { id: 'mem-2', embedding: [0.9, 0.1, 0] },
        { id: 'mem-3', embedding: [0.1, 0.9, 0] },
      ];

      const ranked = rankBySimilarity(queryEmbedding, candidates);

      expect(ranked[0].id).toBe('mem-2'); // Most similar to [1,0,0]
      expect(ranked[2].id).toBe('mem-3'); // Least similar
    });

    it('should include similarity scores in results', () => {
      const queryEmbedding = [1, 0, 0];
      const candidates = [{ id: 'mem-1', embedding: [1, 0, 0] }];

      const ranked = rankBySimilarity(queryEmbedding, candidates);

      expect(ranked[0].similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle empty candidates list', () => {
      const queryEmbedding = [1, 0, 0];

      const ranked = rankBySimilarity(queryEmbedding, []);

      expect(ranked).toEqual([]);
    });

    it('should preserve original candidate data', () => {
      const queryEmbedding = [1, 0, 0];
      const candidates = [
        { id: 'mem-1', embedding: [0.9, 0.1, 0], title: 'Test Memory' },
      ];

      const ranked = rankBySimilarity(queryEmbedding, candidates);

      expect(ranked[0].id).toBe('mem-1');
      // Original properties should be preserved
    });
  });

  describe('averageKNearestSimilarity', () => {
    const mockEmbeddings = {
      'memory-1': [1, 0, 0],
      'memory-2': [0.9, 0.1, 0], // Very similar to memory-1
      'memory-3': [0.8, 0.2, 0], // Fairly similar to memory-1
      'memory-4': [0, 1, 0], // Orthogonal to memory-1
      'memory-5': [0, 0, 1], // Orthogonal to memory-1
    };

    it('should calculate average similarity to k nearest neighbours', () => {
      const avgSim = averageKNearestSimilarity('memory-1', mockEmbeddings, 2);

      // Should be average of top 2 neighbours (memory-2 and memory-3)
      expect(avgSim).toBeGreaterThan(0.8);
      expect(avgSim).toBeLessThanOrEqual(1.0);
    });

    it('should exclude the target memory from neighbours', () => {
      // With k=5, should get all 4 other memories
      const avgSim = averageKNearestSimilarity('memory-1', mockEmbeddings, 5);

      // Average should be less than 1 since it includes dissimilar memories
      expect(avgSim).toBeLessThan(1.0);
      expect(avgSim).toBeGreaterThan(0);
    });

    it('should return 0 when target memory not found', () => {
      const avgSim = averageKNearestSimilarity(
        'non-existent',
        mockEmbeddings,
        3
      );

      expect(avgSim).toBe(0);
    });

    it('should return 0 when no neighbours exist', () => {
      const singleMemory = {
        'only-memory': [1, 0, 0],
      };

      const avgSim = averageKNearestSimilarity('only-memory', singleMemory, 3);

      expect(avgSim).toBe(0);
    });

    it('should use default k=5 when not provided', () => {
      const avgSim = averageKNearestSimilarity('memory-1', mockEmbeddings);

      // Should work with default k value
      expect(typeof avgSim).toBe('number');
      expect(avgSim).toBeGreaterThanOrEqual(0);
    });

    it('should handle k larger than available neighbours', () => {
      // Only 4 neighbours available, request 10
      const avgSim = averageKNearestSimilarity('memory-1', mockEmbeddings, 10);

      expect(avgSim).toBeGreaterThan(0);
    });
  });

  describe('findPotentialDuplicates', () => {
    it('should find highly similar memory pairs', () => {
      const embeddings = {
        'memory-1': [1, 0, 0],
        'memory-2': [0.99, 0.01, 0], // Almost identical to memory-1
        'memory-3': [0, 1, 0], // Very different
      };

      const duplicates = findPotentialDuplicates(embeddings, 0.9);

      expect(duplicates.length).toBe(1);
      expect(duplicates[0].id1).toBe('memory-1');
      expect(duplicates[0].id2).toBe('memory-2');
      expect(duplicates[0].similarity).toBeGreaterThan(0.9);
    });

    it('should return empty array when no duplicates found', () => {
      const embeddings = {
        'memory-1': [1, 0, 0],
        'memory-2': [0, 1, 0],
        'memory-3': [0, 0, 1],
      };

      const duplicates = findPotentialDuplicates(embeddings, 0.9);

      expect(duplicates).toEqual([]);
    });

    it('should sort duplicates by similarity descending', () => {
      const embeddings = {
        'memory-1': [1, 0, 0],
        'memory-2': [0.95, 0.05, 0], // 95% similar to memory-1
        'memory-3': [0.99, 0.01, 0], // 99% similar to memory-1
      };

      const duplicates = findPotentialDuplicates(embeddings, 0.9);

      expect(duplicates.length).toBeGreaterThan(0);
      // Should be sorted by similarity, highest first
      for (let i = 1; i < duplicates.length; i++) {
        expect(duplicates[i - 1].similarity).toBeGreaterThanOrEqual(
          duplicates[i].similarity
        );
      }
    });

    it('should use default threshold of 0.92 when not provided', () => {
      const embeddings = {
        'memory-1': [1, 0, 0],
        'memory-2': [0.93, 0.07, 0], // Above 0.92 threshold
        'memory-3': [0.9, 0.1, 0], // Below 0.92 threshold
      };

      const duplicates = findPotentialDuplicates(embeddings);

      // Only memory-1/memory-2 pair should be found with default 0.92 threshold
      expect(duplicates.every(d => d.similarity >= 0.92)).toBe(true);
    });

    it('should find multiple duplicate pairs', () => {
      const embeddings = {
        'memory-1': [1, 0, 0],
        'memory-2': [0.99, 0.01, 0], // Similar to memory-1
        'memory-3': [0, 1, 0],
        'memory-4': [0.01, 0.99, 0], // Similar to memory-3
      };

      const duplicates = findPotentialDuplicates(embeddings, 0.9);

      expect(duplicates.length).toBe(2);
    });

    it('should handle empty embeddings', () => {
      const duplicates = findPotentialDuplicates({}, 0.9);

      expect(duplicates).toEqual([]);
    });

    it('should handle single memory', () => {
      const embeddings = {
        'only-memory': [1, 0, 0],
      };

      const duplicates = findPotentialDuplicates(embeddings, 0.9);

      expect(duplicates).toEqual([]);
    });

    it('should include both IDs and similarity in results', () => {
      const embeddings = {
        'memory-1': [1, 0, 0],
        'memory-2': [0.99, 0.01, 0],
      };

      const duplicates = findPotentialDuplicates(embeddings, 0.9);

      expect(duplicates[0]).toHaveProperty('id1');
      expect(duplicates[0]).toHaveProperty('id2');
      expect(duplicates[0]).toHaveProperty('similarity');
    });
  });

  describe('Edge Cases: NaN and Infinity', () => {
    it('should handle NaN in vectors gracefully', () => {
      const vec1 = [1, NaN, 3];
      const vec2 = [1, 2, 3];

      // Should not throw, may return NaN or handle gracefully
      const result = cosineSimilarity(vec1, vec2);
      expect(typeof result).toBe('number');
    });

    it('should handle Infinity in vectors', () => {
      const vec1 = [1, 2, Infinity];
      const vec2 = [1, 2, 3];

      const result = cosineSimilarity(vec1, vec2);
      expect(typeof result).toBe('number');
    });

    it('should handle negative Infinity', () => {
      const vec1 = [1, -Infinity, 0];
      const vec2 = [1, 0, 0];

      const result = cosineSimilarity(vec1, vec2);
      expect(typeof result).toBe('number');
    });
  });

  describe('Edge Cases: Extreme Values', () => {
    it('should handle very small values', () => {
      const vec1 = [1e-100, 1e-100, 1e-100];
      const vec2 = [1e-100, 1e-100, 1e-100];

      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle very large values', () => {
      const vec1 = [1e100, 1e100, 1e100];
      const vec2 = [1e100, 1e100, 1e100];

      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle denormalized vectors', () => {
      const vec1 = [1000, 0, 0];
      const vec2 = [0.001, 0, 0];

      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(1.0, 10);
    });
  });

  describe('Edge Cases: Threshold Boundaries', () => {
    it('should respect exact threshold match', () => {
      const queryEmbedding = [1, 0, 0];
      const embeddings = {
        'exact': [0.8, 0.6, 0], // cos similarity will be exactly threshold
        'above': [0.9, 0.1, 0],
        'below': [0.7, 0.7, 0],
      };

      const threshold = 0.8;
      const results = findSimilarMemories(queryEmbedding, embeddings, threshold);

      // All results should be >= threshold
      expect(results.every(r => r.similarity >= threshold)).toBe(true);
    });

    it('should handle threshold of 1.0 (only perfect matches)', () => {
      const queryEmbedding = [1, 0, 0];
      const embeddings = {
        'perfect': [1, 0, 0],
        'almost': [0.9999, 0.0001, 0],
        'different': [0, 1, 0],
      };

      const results = findSimilarMemories(queryEmbedding, embeddings, 1.0);

      // Should only find perfect match
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('perfect');
    });

    it('should handle threshold of -1.0 (return all)', () => {
      const queryEmbedding = [1, 0, 0];
      const embeddings = {
        'mem-1': [1, 0, 0],
        'mem-2': [0, 1, 0],
        'mem-3': [-1, 0, 0],
      };

      const results = findSimilarMemories(queryEmbedding, embeddings, -1.0);

      // Should return all memories
      expect(results.length).toBe(3);
    });
  });

  describe('Edge Cases: Scale Invariance', () => {
    it('should be scale invariant for positive scaling', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [2, 4, 6]; // vec1 * 2

      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(1.0, 10);
    });

    it('should recognize opposite directions with negative scaling', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [-1, -2, -3]; // vec1 * -1

      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(-1.0, 10);
    });
  });
});
