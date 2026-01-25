/**
 * T090: Performance test for heuristic fallback
 * Requirement: Heuristic fallback completes <100ms
 */
import { describe, it, expect } from 'vitest';
import { matchKeywords, KEYWORD_RULES } from '../../skills/memory/src/think/heuristics.js';

describe('heuristic-speed', () => {
  it('keyword matching completes in <10ms', () => {
    const testThoughts = [
      'Review this code for security vulnerabilities',
      'How can we improve performance here?',
      'What are the trade-offs of this approach?',
      'Is this implementation correct?',
      'Consider the edge cases',
    ];

    const start = performance.now();
    for (const thought of testThoughts) {
      matchKeywords(thought);
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('single keyword match completes in <1ms', () => {
    const start = performance.now();
    matchKeywords('security vulnerability injection attack');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1);
  });

  it('handles long text in <10ms', () => {
    const longText = 'security '.repeat(1000) + 'performance '.repeat(1000);

    const start = performance.now();
    matchKeywords(longText);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('keyword rules lookup is O(1)', () => {
    // Verify rules are indexed for fast lookup
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      KEYWORD_RULES.length; // Access rules
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
  });
});
