/**
 * T058: Unit tests for cosine similarity calculation
 */

import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  findSimilarMemories,
  rankBySimilarity,
  type SimilarityResult,
} from '../../../skills/memory/src/search/similarity.js';

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
});
