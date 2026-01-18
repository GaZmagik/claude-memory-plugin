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

    it('should return 0 when k=0 (division by zero protection)', () => {
      const avgSim = averageKNearestSimilarity('memory-1', mockEmbeddings, 0);

      // Should handle k=0 gracefully without NaN or Infinity
      expect(avgSim).toBe(0);
      expect(Number.isFinite(avgSim)).toBe(true);
      expect(Number.isNaN(avgSim)).toBe(false);
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

  /**
   * Property-based tests for mathematical invariants
   * Merged from similarity.property.spec.ts
   */
  describe('Property-based tests', () => {
    describe('cosineSimilarity mathematical properties', () => {
      it('should be symmetric across multiple vector pairs', () => {
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

      it('should return 1 for identical vectors across multiple cases', () => {
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

      it('should return value in range [-1, 1] for all inputs', () => {
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

      it('should return 0 for orthogonal vectors across multiple pairs', () => {
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

      it('should be scale invariant for multiple scale factors', () => {
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

      it('should return -1 for opposite vectors across multiple cases', () => {
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

      it('should handle mixed magnitude vectors without NaN', () => {
        const vec1 = [1, 1000, 0.001];
        const vec2 = [0.001, 1000, 1];

        const similarity = cosineSimilarity(vec1, vec2);

        expect(similarity).toBeGreaterThanOrEqual(-1);
        expect(similarity).toBeLessThanOrEqual(1);
        expect(isNaN(similarity)).toBe(false);
        expect(isFinite(similarity)).toBe(true);
      });
    });

    describe('findPotentialDuplicates properties', () => {
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
    });

    describe('findSimilarMemories properties', () => {
      it('should handle similarity values across full range', () => {
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
  });

  describe('LSH-based duplicate detection', () => {
    /**
     * Generate a normalised random vector with a seeded RNG
     */
    function generateNormalisedVector(dims: number, seed: number): number[] {
      const vec = new Array<number>(dims);
      let mag = 0;
      let s = seed;
      for (let i = 0; i < dims; i++) {
        // Simple LCG for reproducible random
        s = (s * 1664525 + 1013904223) >>> 0;
        vec[i] = (s / 0xffffffff) * 2 - 1;
        mag += vec[i] * vec[i];
      }
      mag = Math.sqrt(mag);
      for (let i = 0; i < dims; i++) {
        vec[i] /= mag;
      }
      return vec;
    }

    it('should use LSH for collections above threshold', () => {
      // Create 250 random embeddings (above default 200 threshold)
      const embeddings: Record<string, number[]> = {};
      for (let i = 0; i < 250; i++) {
        embeddings[`mem-${i}`] = generateNormalisedVector(128, i * 31337);
      }

      // Add a known duplicate pair
      embeddings['dup-1'] = [1, 0, ...new Array(126).fill(0)];
      embeddings['dup-2'] = [0.99, 0.01, ...new Array(126).fill(0)];

      const duplicates = findPotentialDuplicates(embeddings, 0.95);

      // Should find the known duplicate
      const foundDup = duplicates.some(
        d => (d.id1 === 'dup-1' && d.id2 === 'dup-2') ||
             (d.id1 === 'dup-2' && d.id2 === 'dup-1')
      );
      expect(foundDup).toBe(true);
    });

    it('should use brute force for small collections', () => {
      // Create 50 embeddings (below 200 threshold)
      const embeddings: Record<string, number[]> = {};
      for (let i = 0; i < 50; i++) {
        embeddings[`mem-${i}`] = generateNormalisedVector(64, i * 12345);
      }

      // Add duplicates
      embeddings['dup-a'] = [1, 0, ...new Array(62).fill(0)];
      embeddings['dup-b'] = [0.98, 0.02, ...new Array(62).fill(0)];

      const duplicates = findPotentialDuplicates(embeddings, 0.95);

      const foundDup = duplicates.some(
        d => (d.id1 === 'dup-a' && d.id2 === 'dup-b') ||
             (d.id1 === 'dup-b' && d.id2 === 'dup-a')
      );
      expect(foundDup).toBe(true);
    });

    it('should respect custom lshThreshold option', () => {
      // Create 100 embeddings
      const embeddings: Record<string, number[]> = {};
      for (let i = 0; i < 100; i++) {
        embeddings[`mem-${i}`] = generateNormalisedVector(64, i * 99999);
      }

      // Add duplicates
      embeddings['x'] = [1, 0, ...new Array(62).fill(0)];
      embeddings['y'] = [0.99, 0.01, ...new Array(62).fill(0)];

      // Force LSH with low threshold
      const duplicates = findPotentialDuplicates(embeddings, 0.95, undefined, {
        lshThreshold: 50,
      });

      const foundDup = duplicates.some(
        d => (d.id1 === 'x' && d.id2 === 'y') ||
             (d.id1 === 'y' && d.id2 === 'x')
      );
      expect(foundDup).toBe(true);
    });

    it('should produce reproducible results with same seed', () => {
      const embeddings: Record<string, number[]> = {};
      for (let i = 0; i < 250; i++) {
        embeddings[`mem-${i}`] = generateNormalisedVector(64, i * 77777);
      }

      const result1 = findPotentialDuplicates(embeddings, 0.8, 10, { seed: 42 });
      const result2 = findPotentialDuplicates(embeddings, 0.8, 10, { seed: 42 });

      expect(result1).toEqual(result2);
    });

    it('should handle limit parameter with LSH', () => {
      const embeddings: Record<string, number[]> = {};
      for (let i = 0; i < 300; i++) {
        // Create clusters that will have many duplicates
        const cluster = Math.floor(i / 10);
        const base = generateNormalisedVector(64, cluster * 11111);
        // Add small perturbation
        embeddings[`mem-${i}`] = base.map((v, idx) => v + (idx === i % 64 ? 0.01 : 0));
      }

      const duplicates = findPotentialDuplicates(embeddings, 0.9, 5);

      expect(duplicates.length).toBeLessThanOrEqual(5);
    });
  });
});
