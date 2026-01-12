/**
 * T101: Unit tests for relevance scorer
 *
 * Tests the relevance scoring algorithm used to rank memories
 * for context injection.
 */

import { describe, it, expect } from 'vitest';
import {
  scoreTagMatch,
  scoreFileMatch,
  scoreRecency,
  scoreSeverity,
  combineScores,
  calculateRelevanceScore,
  sortByRelevance,
  filterByRelevance,
  DEFAULT_WEIGHTS,
} from '../../../hooks/src/memory/relevance-scorer.js';
import { Severity } from '../../../skills/memory/src/types/enums.js';

describe('Relevance Scorer', () => {
  describe('scoreTagMatch', () => {
    it('should return 0 for empty memory tags', () => {
      expect(scoreTagMatch([], ['typescript', 'testing'])).toBe(0);
    });

    it('should return 0 for empty context tags', () => {
      expect(scoreTagMatch(['typescript', 'testing'], [])).toBe(0);
    });

    it('should return 0 for no matching tags', () => {
      expect(scoreTagMatch(['python', 'flask'], ['typescript', 'react'])).toBe(0);
    });

    it('should return positive score for matching tags', () => {
      const score = scoreTagMatch(['typescript', 'testing'], ['typescript', 'react']);
      expect(score).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const score = scoreTagMatch(['TypeScript', 'TESTING'], ['typescript', 'testing']);
      expect(score).toBeGreaterThan(0);
    });

    it('should give higher score for more matches', () => {
      const oneMatch = scoreTagMatch(['ts', 'testing'], ['ts', 'react', 'hooks']);
      const twoMatch = scoreTagMatch(['ts', 'testing'], ['ts', 'testing', 'hooks']);

      expect(twoMatch).toBeGreaterThan(oneMatch);
    });

    it('should cap score at 1.0', () => {
      const score = scoreTagMatch(
        ['a', 'b', 'c', 'd', 'e'],
        ['a', 'b', 'c', 'd', 'e']
      );
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('scoreFileMatch', () => {
    it('should return 0 for empty patterns', () => {
      expect(scoreFileMatch('src/index.ts', [])).toBe(0);
    });

    it('should return 1.0 for exact match', () => {
      expect(scoreFileMatch('src/index.ts', ['src/index.ts'])).toBe(1.0);
    });

    it('should return 0.8 for directory match', () => {
      expect(scoreFileMatch('src/utils/helper.ts', ['src/utils/'])).toBe(0.8);
    });

    it('should return 0.6 for glob match', () => {
      expect(scoreFileMatch('src/utils/helper.ts', ['**/*.ts'])).toBe(0.6);
    });

    it('should return 0 for no match', () => {
      expect(scoreFileMatch('src/index.ts', ['other/file.js'])).toBe(0);
    });
  });

  describe('scoreRecency', () => {
    it('should return ~1.0 for very recent updates', () => {
      const now = new Date().toISOString();
      const score = scoreRecency(now);

      expect(score).toBeGreaterThan(0.9);
    });

    it('should decay over time', () => {
      const recent = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
      const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days ago

      const recentScore = scoreRecency(recent);
      const oldScore = scoreRecency(old);

      expect(recentScore).toBeGreaterThan(oldScore);
    });

    it('should have minimum score of 0.1', () => {
      const veryOld = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year ago
      const score = scoreRecency(veryOld);

      expect(score).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('scoreSeverity', () => {
    it('should return 1.0 for critical severity', () => {
      expect(scoreSeverity(Severity.Critical)).toBe(1.0);
    });

    it('should return 0.8 for high severity', () => {
      expect(scoreSeverity(Severity.High)).toBe(0.8);
    });

    it('should return 0.5 for medium severity', () => {
      expect(scoreSeverity(Severity.Medium)).toBe(0.5);
    });

    it('should return 0.3 for low severity', () => {
      expect(scoreSeverity(Severity.Low)).toBe(0.3);
    });

    it('should return 0.5 (medium) for undefined severity', () => {
      expect(scoreSeverity(undefined)).toBe(0.5);
    });
  });

  describe('combineScores', () => {
    it('should combine scores using default weights', () => {
      const scores = {
        tagMatch: 1.0,
        fileMatch: 1.0,
        recency: 1.0,
        severity: 1.0,
      };

      const combined = combineScores(scores);

      expect(combined).toBe(1.0);
    });

    it('should weight file match higher by default', () => {
      const highFile = combineScores({
        tagMatch: 0,
        fileMatch: 1.0,
        recency: 0,
        severity: 0,
      });

      const highTag = combineScores({
        tagMatch: 1.0,
        fileMatch: 0,
        recency: 0,
        severity: 0,
      });

      expect(highFile).toBeGreaterThan(highTag);
    });

    it('should use custom weights when provided', () => {
      const scores = {
        tagMatch: 1.0,
        fileMatch: 0,
        recency: 0,
        severity: 0,
      };

      const customWeights = {
        tagMatch: 1.0,
        fileMatch: 0,
        recency: 0,
        severity: 0,
      };

      const combined = combineScores(scores, customWeights);

      expect(combined).toBe(1.0);
    });

    it('should normalise weights', () => {
      const scores = {
        tagMatch: 1.0,
        fileMatch: 1.0,
        recency: 1.0,
        severity: 1.0,
      };

      const weights = {
        tagMatch: 1,
        fileMatch: 1,
        recency: 1,
        severity: 1,
      };

      // All 1s with equal weights should give 1.0
      expect(combineScores(scores, weights)).toBeCloseTo(1.0, 2);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should calculate overall relevance score', () => {
      const memory = {
        tags: ['typescript', 'testing'],
        patterns: ['src/'],
        updated: new Date().toISOString(),
        severity: Severity.High,
      };

      const context = {
        filePath: 'src/utils/helper.ts',
        contextTags: ['typescript'],
      };

      const score = calculateRelevanceScore(memory, context);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle empty context tags', () => {
      const memory = {
        tags: ['test'],
        patterns: [],
        updated: new Date().toISOString(),
      };

      const context = {
        filePath: 'src/index.ts',
      };

      const score = calculateRelevanceScore(memory, context);

      expect(score).toBeDefined();
    });

    it('should return low score for irrelevant memories', () => {
      const context = {
        filePath: 'src/utils/helper.ts',
        contextTags: ['utils'],
      };

      const memory = {
        tags: ['database', 'sql'],
        patterns: ['src/db/'],
        updated: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        severity: Severity.Low,
      };

      const score = calculateRelevanceScore(memory, context);
      expect(score).toBeLessThan(0.3);
    });

    it('should prioritise high severity gotchas', () => {
      const context = {
        filePath: 'src/index.ts',
        contextTags: ['typescript'],
      };

      const lowSeverity = {
        tags: ['typescript'],
        patterns: [],
        updated: new Date().toISOString(),
        severity: Severity.Low,
      };

      const highSeverity = {
        tags: ['typescript'],
        patterns: [],
        updated: new Date().toISOString(),
        severity: Severity.Critical,
      };

      expect(calculateRelevanceScore(highSeverity, context)).toBeGreaterThan(
        calculateRelevanceScore(lowSeverity, context)
      );
    });
  });

  describe('sortByRelevance', () => {
    it('should sort memories by relevance score descending', () => {
      const memories = [
        {
          id: 'low',
          tags: ['unrelated'],
          patterns: [],
          updated: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'high',
          tags: ['typescript'],
          patterns: ['src/'],
          updated: new Date().toISOString(),
          severity: Severity.Critical,
        },
      ];

      const context = {
        filePath: 'src/index.ts',
        contextTags: ['typescript'],
      };

      const sorted = sortByRelevance(memories, context);

      expect(sorted[0].id).toBe('high');
      expect(sorted[1].id).toBe('low');
      expect(sorted[0].relevanceScore).toBeGreaterThan(sorted[1].relevanceScore);
    });

    it('should include relevanceScore in results', () => {
      const memories = [
        {
          tags: ['test'],
          patterns: [],
          updated: new Date().toISOString(),
        },
      ];

      const context = { filePath: 'test.ts' };
      const sorted = sortByRelevance(memories, context);

      expect(sorted[0]).toHaveProperty('relevanceScore');
      expect(typeof sorted[0].relevanceScore).toBe('number');
    });
  });

  describe('filterByRelevance', () => {
    it('should filter out low relevance memories', () => {
      const memories = [
        {
          id: 'relevant',
          tags: ['typescript'],
          patterns: ['src/index.ts'],
          updated: new Date().toISOString(),
          severity: Severity.High,
        },
        {
          id: 'irrelevant',
          tags: ['python'],
          patterns: ['other/'],
          updated: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const context = {
        filePath: 'src/index.ts',
        contextTags: ['typescript'],
      };

      const filtered = filterByRelevance(memories, context, 0.5);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('relevant');
    });

    it('should use default threshold of 0.3', () => {
      const memories = [
        {
          tags: [],
          patterns: [],
          updated: new Date().toISOString(),
        },
      ];

      const context = { filePath: 'test.ts' };
      const filtered = filterByRelevance(memories, context);

      // Should filter based on default threshold
      expect(Array.isArray(filtered)).toBe(true);
    });

    it('should return empty array when no memories meet threshold', () => {
      const memories = [
        {
          tags: ['unrelated'],
          patterns: ['other/'],
          updated: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const context = {
        filePath: 'src/index.ts',
        contextTags: ['typescript'],
      };

      const filtered = filterByRelevance(memories, context, 0.9);

      expect(filtered).toEqual([]);
    });
  });

  describe('DEFAULT_WEIGHTS', () => {
    it('should have expected weight values', () => {
      expect(DEFAULT_WEIGHTS.fileMatch).toBe(0.4);
      expect(DEFAULT_WEIGHTS.tagMatch).toBe(0.3);
      expect(DEFAULT_WEIGHTS.recency).toBe(0.2);
      expect(DEFAULT_WEIGHTS.severity).toBe(0.1);
    });

    it('should sum to 1.0', () => {
      const sum =
        DEFAULT_WEIGHTS.tagMatch +
        DEFAULT_WEIGHTS.fileMatch +
        DEFAULT_WEIGHTS.recency +
        DEFAULT_WEIGHTS.severity;

      expect(sum).toBeCloseTo(1.0);
    });
  });
});
