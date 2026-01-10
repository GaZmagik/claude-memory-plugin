/**
 * T101: Unit test for tag-based relevance scoring
 *
 * Tests the relevance scoring algorithm that determines
 * how relevant a memory is to the current context.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRelevanceScore,
  scoreTagMatch,
  scoreFileMatch,
  scoreRecency,
  scoreSeverity,
  combineScores,
  RelevanceContext,
  RelevanceWeights,
} from '../../../hooks/lib/relevance-scorer.js';
import { Severity } from '../../../skills/memory/src/types/enums.js';

describe('Relevance Scorer', () => {
  describe('scoreTagMatch', () => {
    it('should return 1.0 for exact tag match', () => {
      const memoryTags = ['typescript', 'testing', 'vitest'];
      const contextTags = ['typescript'];

      expect(scoreTagMatch(memoryTags, contextTags)).toBe(1.0);
    });

    it('should return 0 for no matching tags', () => {
      const memoryTags = ['python', 'django'];
      const contextTags = ['typescript', 'react'];

      expect(scoreTagMatch(memoryTags, contextTags)).toBe(0);
    });

    it('should scale with proportion of matching tags', () => {
      const memoryTags = ['typescript', 'testing', 'vitest'];
      // All match: 2/2 = 1.0
      const allMatch = scoreTagMatch(memoryTags, ['typescript', 'testing']);
      // Partial match: 1/2 = 0.5
      const partialMatch = scoreTagMatch(memoryTags, ['typescript', 'python']);
      // No match: 0/2 = 0
      const noMatch = scoreTagMatch(memoryTags, ['python', 'django']);

      expect(allMatch).toBeGreaterThan(partialMatch);
      expect(partialMatch).toBeGreaterThan(noMatch);
      expect(noMatch).toBe(0);
    });

    it('should handle empty arrays', () => {
      expect(scoreTagMatch([], ['typescript'])).toBe(0);
      expect(scoreTagMatch(['typescript'], [])).toBe(0);
    });
  });

  describe('scoreFileMatch', () => {
    it('should return 1.0 for exact file match', () => {
      const filePath = 'src/hooks/pre-tool-use/check.ts';
      const patterns = ['src/hooks/pre-tool-use/check.ts'];

      expect(scoreFileMatch(filePath, patterns)).toBe(1.0);
    });

    it('should return 0.8 for directory match', () => {
      const filePath = 'src/hooks/pre-tool-use/check.ts';
      const patterns = ['src/hooks/'];

      expect(scoreFileMatch(filePath, patterns)).toBeCloseTo(0.8, 1);
    });

    it('should return 0.6 for glob pattern match', () => {
      const filePath = 'src/hooks/pre-tool-use/check.ts';
      const patterns = ['**/*.ts'];

      expect(scoreFileMatch(filePath, patterns)).toBeCloseTo(0.6, 1);
    });

    it('should return 0 for no match', () => {
      const filePath = 'src/utils/helper.ts';
      const patterns = ['src/hooks/', 'tests/'];

      expect(scoreFileMatch(filePath, patterns)).toBe(0);
    });
  });

  describe('scoreRecency', () => {
    it('should return 1.0 for memories updated today', () => {
      const today = new Date();
      expect(scoreRecency(today.toISOString())).toBeCloseTo(1.0, 1);
    });

    it('should decay over time', () => {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const todayScore = scoreRecency(today.toISOString());
      const weekScore = scoreRecency(weekAgo.toISOString());
      const monthScore = scoreRecency(monthAgo.toISOString());

      expect(todayScore).toBeGreaterThan(weekScore);
      expect(weekScore).toBeGreaterThan(monthScore);
    });

    it('should have minimum score for very old memories', () => {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);

      const score = scoreRecency(yearAgo.toISOString());
      expect(score).toBeGreaterThanOrEqual(0.1);
      expect(score).toBeLessThanOrEqual(0.3);
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

    it('should return 0.5 for undefined severity', () => {
      expect(scoreSeverity(undefined)).toBe(0.5);
    });
  });

  describe('combineScores', () => {
    it('should combine scores using weights', () => {
      const scores = {
        tagMatch: 0.8,
        fileMatch: 0.6,
        recency: 0.9,
        severity: 0.5,
      };

      const weights: RelevanceWeights = {
        tagMatch: 0.3,
        fileMatch: 0.4,
        recency: 0.2,
        severity: 0.1,
      };

      const combined = combineScores(scores, weights);
      // 0.8*0.3 + 0.6*0.4 + 0.9*0.2 + 0.5*0.1 = 0.24 + 0.24 + 0.18 + 0.05 = 0.71
      expect(combined).toBeCloseTo(0.71, 2);
    });

    it('should normalise weights', () => {
      const scores = {
        tagMatch: 1.0,
        fileMatch: 1.0,
        recency: 1.0,
        severity: 1.0,
      };

      const weights: RelevanceWeights = {
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
      const context: RelevanceContext = {
        filePath: 'src/hooks/check.ts',
        contextTags: ['hooks', 'typescript'],
      };

      const memory = {
        tags: ['hooks', 'gotcha'],
        patterns: ['src/hooks/'],
        updated: new Date().toISOString(),
        severity: Severity.High,
      };

      const score = calculateRelevanceScore(memory, context);
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('should return low score for irrelevant memories', () => {
      const context: RelevanceContext = {
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
      const context: RelevanceContext = {
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
});
