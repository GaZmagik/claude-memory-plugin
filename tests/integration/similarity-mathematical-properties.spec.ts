/**
 * Property-based tests for similarity scoring mathematical correctness
 *
 * These tests verify mathematical properties that should hold for all inputs.
 */

import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  findSimilarMemories,
  rankBySimilarity,
  averageKNearestSimilarity,
  findPotentialDuplicates,
} from '../../skills/memory/src/search/similarity.js';

function randomVector(dimension: number): number[] {
  return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
}

function unitVector(dimension: number): number[] {
  const vec = randomVector(dimension);
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return vec.map(v => v / magnitude);
}

describe('cosineSimilarity - Mathematical Properties', () => {
  it('reflexivity: sim(v, v) = 1', () => {
    for (let i = 0; i < 20; i++) {
      const vec = randomVector(128);
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 10);
    }
  });

  it('symmetry: sim(v1, v2) = sim(v2, v1)', () => {
    for (let i = 0; i < 20; i++) {
      const vec1 = randomVector(128);
      const vec2 = randomVector(128);
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(cosineSimilarity(vec2, vec1), 10);
    }
  });

  it('range: -1 <= sim(v1, v2) <= 1', () => {
    for (let i = 0; i < 50; i++) {
      const vec1 = randomVector(256);
      const vec2 = randomVector(256);
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    }
  });

  it('opposite vectors: sim(v, -v) = -1', () => {
    for (let i = 0; i < 20; i++) {
      const vec1 = randomVector(128);
      const vec2 = vec1.map(v => -v);
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1, 10);
    }
  });

  it('scale invariance: sim(v, kv) = 1 for k > 0', () => {
    for (let i = 0; i < 20; i++) {
      const vec1 = randomVector(128);
      const scale = Math.random() * 100 + 0.1;
      const vec2 = vec1.map(v => v * scale);
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(1, 10);
    }
  });

  it('zero vector returns 0', () => {
    const zero = Array(128).fill(0);
    const vec = randomVector(128);
    expect(cosineSimilarity(zero, vec)).toBe(0);
  });

  it('numerical stability with extreme values', () => {
    const vec1 = Array(128).fill(1e10);
    const vec2 = Array(128).fill(1e10);
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(1, 5);
  });
});

describe('findSimilarMemories - Properties', () => {
  it('threshold filtering works correctly', () => {
    const queryEmbedding = randomVector(128);
    const embeddings: Record<string, number[]> = {};

    for (let i = 0; i < 50; i++) {
      embeddings[`mem-${i}`] = randomVector(128);
    }

    const threshold = 0.7;
    const results = findSimilarMemories(queryEmbedding, embeddings, threshold);

    for (const result of results) {
      expect(result.similarity).toBeGreaterThanOrEqual(threshold);
    }
  });

  it('results are sorted in descending order', () => {
    const queryEmbedding = randomVector(128);
    const embeddings: Record<string, number[]> = {};

    for (let i = 0; i < 30; i++) {
      embeddings[`mem-${i}`] = randomVector(128);
    }

    const results = findSimilarMemories(queryEmbedding, embeddings, 0);

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.similarity).toBeGreaterThanOrEqual(results[i]!.similarity);
    }
  });

  it('respects limit parameter', () => {
    const queryEmbedding = randomVector(128);
    const embeddings: Record<string, number[]> = {};

    for (let i = 0; i < 100; i++) {
      embeddings[`mem-${i}`] = randomVector(128);
    }

    const limits = [5, 10, 20, 50];

    for (const limit of limits) {
      const results = findSimilarMemories(queryEmbedding, embeddings, 0, limit);
      expect(results.length).toBeLessThanOrEqual(limit);
    }
  });

  it('excludes specified ID', () => {
    const queryEmbedding = randomVector(128);
    const embeddings: Record<string, number[]> = {
      'mem-1': randomVector(128),
      'mem-2': randomVector(128),
      'mem-3': randomVector(128),
    };

    const results = findSimilarMemories(queryEmbedding, embeddings, 0, undefined, 'mem-2');

    expect(results.find(r => r.id === 'mem-2')).toBeUndefined();
  });
});

describe('rankBySimilarity - Properties', () => {
  it('ranks in descending similarity order', () => {
    const queryEmbedding = randomVector(128);
    const candidates = Array.from({ length: 50 }, (_, i) => ({
      id: `candidate-${i}`,
      embedding: randomVector(128),
    }));

    const ranked = rankBySimilarity(queryEmbedding, candidates);

    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.similarity).toBeGreaterThanOrEqual(ranked[i]!.similarity);
    }
  });

  it('returns all candidates', () => {
    const queryEmbedding = randomVector(128);
    const candidates = Array.from({ length: 30 }, (_, i) => ({
      id: `candidate-${i}`,
      embedding: randomVector(128),
    }));

    const ranked = rankBySimilarity(queryEmbedding, candidates);

    expect(ranked.length).toBe(candidates.length);
  });

  it('adds valid similarity scores', () => {
    const queryEmbedding = randomVector(128);
    const candidates = Array.from({ length: 20 }, (_, i) => ({
      id: `candidate-${i}`,
      embedding: randomVector(128),
    }));

    const ranked = rankBySimilarity(queryEmbedding, candidates);

    for (const result of ranked) {
      expect(result.similarity).toBeDefined();
      expect(result.similarity).toBeGreaterThanOrEqual(-1);
      expect(result.similarity).toBeLessThanOrEqual(1);
    }
  });
});

describe('averageKNearestSimilarity - Properties', () => {
  it('returns average within valid range', () => {
    const embeddings: Record<string, number[]> = {};

    for (let i = 0; i < 20; i++) {
      embeddings[`mem-${i}`] = randomVector(128);
    }

    for (let i = 0; i < 10; i++) {
      const avg = averageKNearestSimilarity(`mem-${i}`, embeddings, 5);
      expect(avg).toBeGreaterThanOrEqual(-1);
      expect(avg).toBeLessThanOrEqual(1);
    }
  });

  it('handles different k values', () => {
    const embeddings: Record<string, number[]> = {};

    for (let i = 0; i < 50; i++) {
      embeddings[`mem-${i}`] = randomVector(128);
    }

    const kValues = [1, 3, 5, 10, 20];

    for (const k of kValues) {
      const avg = averageKNearestSimilarity('mem-0', embeddings, k);
      expect(avg).toBeGreaterThanOrEqual(-1);
      expect(avg).toBeLessThanOrEqual(1);
    }
  });

  it('excludes target from its own neighbours', () => {
    const vec = randomVector(128);
    const embeddings: Record<string, number[]> = {
      'target': vec,
      'clone': [...vec],
    };

    const avg = averageKNearestSimilarity('target', embeddings, 1);

    expect(avg).toBeCloseTo(1, 10);
  });
});

describe('findPotentialDuplicates - Properties', () => {
  it('includes each pair only once', () => {
    const embeddings: Record<string, number[]> = {};
    const baseVec = randomVector(128);

    for (let i = 0; i < 10; i++) {
      embeddings[`mem-${i}`] = baseVec.map(v => v + (Math.random() - 0.5) * 0.1);
    }

    const duplicates = findPotentialDuplicates(embeddings, 0.9);
    const pairs = new Set<string>();

    for (const dup of duplicates) {
      const pair1 = `${dup.id1}:${dup.id2}`;
      const pair2 = `${dup.id2}:${dup.id1}`;

      expect(pairs.has(pair1)).toBe(false);
      expect(pairs.has(pair2)).toBe(false);

      pairs.add(pair1);
    }
  });

  it('only returns pairs above threshold', () => {
    const embeddings: Record<string, number[]> = {};

    for (let i = 0; i < 20; i++) {
      embeddings[`mem-${i}`] = randomVector(128);
    }

    const threshold = 0.95;
    const duplicates = findPotentialDuplicates(embeddings, threshold);

    for (const dup of duplicates) {
      expect(dup.similarity).toBeGreaterThanOrEqual(threshold);
    }
  });

  it('sorts duplicates by similarity descending', () => {
    const baseVec = randomVector(128);
    const embeddings: Record<string, number[]> = {};

    for (let i = 0; i < 15; i++) {
      embeddings[`mem-${i}`] = baseVec.map(v => v + (Math.random() - 0.5) * 0.2);
    }

    const duplicates = findPotentialDuplicates(embeddings, 0.8);

    for (let i = 1; i < duplicates.length; i++) {
      expect(duplicates[i - 1]!.similarity).toBeGreaterThanOrEqual(duplicates[i]!.similarity);
    }
  });
});
