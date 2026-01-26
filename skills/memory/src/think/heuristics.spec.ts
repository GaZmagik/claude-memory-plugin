/**
 * Unit tests for heuristics matching
 */
import { describe, it, expect } from 'vitest';
import { matchHeuristics, HEURISTIC_RULES } from './heuristics.js';

describe('matchHeuristics', () => {
  describe('security keywords', () => {
    it('matches security topics to Devils-Advocate', () => {
      const result = matchHeuristics('Check for SQL injection vulnerabilities');
      expect(result).not.toBeNull();
      expect(result?.style).toBe('Devils-Advocate');
    });

    it('matches risk keywords', () => {
      const result = matchHeuristics('What are the security risks here?');
      expect(result?.style).toBe('Devils-Advocate');
    });
  });

  describe('architecture keywords', () => {
    it('matches design topics to Socratic', () => {
      const result = matchHeuristics('How should we design this architecture?');
      expect(result?.style).toBe('Socratic');
    });
  });

  describe('comparison keywords', () => {
    it('matches comparison topics to Comparative', () => {
      const result = matchHeuristics('Compare React versus Vue');
      expect(result?.style).toBe('Comparative');
    });

    it('matches tradeoff keywords', () => {
      const result = matchHeuristics('What are the trade-offs?');
      expect(result?.style).toBe('Comparative');
    });
  });

  describe('no match', () => {
    it('returns null for unmatched content', () => {
      const result = matchHeuristics('Hello world');
      expect(result).toBeNull();
    });
  });

  describe('avoid list', () => {
    it('skips styles in avoid list', () => {
      const result = matchHeuristics('security vulnerability', ['Devils-Advocate']);
      expect(result?.style).not.toBe('Devils-Advocate');
    });
  });

  describe('HEURISTIC_RULES export', () => {
    it('exports rules array', () => {
      expect(Array.isArray(HEURISTIC_RULES)).toBe(true);
      expect(HEURISTIC_RULES.length).toBeGreaterThan(0);
    });
  });
});
