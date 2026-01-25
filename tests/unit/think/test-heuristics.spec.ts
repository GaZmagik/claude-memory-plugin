/**
 * T041 [US2] Unit test for heuristic keyword matching rules
 * TDD Red Phase - Tests written before implementation
 */
import { describe, it, expect } from 'vitest';
import { matchHeuristics } from '../../../skills/memory/src/think/heuristics.js';

describe('heuristics', () => {
  describe('matchHeuristics', () => {
    it('returns null when no keywords match', () => {
      const result = matchHeuristics('Hello world');
      expect(result).toBeNull();
    });

    it('matches security keywords to Devils-Advocate style', () => {
      const result = matchHeuristics('SQL injection vulnerability');
      expect(result).not.toBeNull();
      expect(result?.style).toBe('Devils-Advocate');
    });

    it('matches risk keywords to Devils-Advocate style', () => {
      const result = matchHeuristics('What are the risks of this approach?');
      expect(result).not.toBeNull();
      expect(result?.style).toBe('Devils-Advocate');
    });

    it('matches architecture keywords to Socratic style', () => {
      const result = matchHeuristics('How should we design the API?');
      expect(result).not.toBeNull();
      expect(result?.style).toBe('Socratic');
    });

    it('matches tradeoff keywords to Comparative style', () => {
      const result = matchHeuristics('Compare REST vs GraphQL tradeoffs');
      expect(result).not.toBeNull();
      expect(result?.style).toBe('Comparative');
    });

    it('matches summary keywords to Concise style', () => {
      const result = matchHeuristics('Summarise the key points');
      expect(result).not.toBeNull();
      expect(result?.style).toBe('Concise');
    });

    it('is case insensitive', () => {
      const result = matchHeuristics('SECURITY VULNERABILITY');
      expect(result).not.toBeNull();
      expect(result?.style).toBe('Devils-Advocate');
    });

    it('returns confidence score', () => {
      const result = matchHeuristics('SQL injection security risk');
      expect(result).not.toBeNull();
      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.confidence).toBeLessThanOrEqual(1);
    });

    it('respects avoid list', () => {
      const result = matchHeuristics('security vulnerability', ['Devils-Advocate']);
      expect(result?.style).not.toBe('Devils-Advocate');
    });

    it('returns null if all matches are in avoid list', () => {
      const result = matchHeuristics('security', ['Devils-Advocate']);
      expect(result).toBeNull();
    });
  });
});
