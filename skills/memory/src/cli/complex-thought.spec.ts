/**
 * Tests for Complex Thought Detection
 */

import { describe, it, expect } from 'vitest';
import { isComplexThought, DEFAULT_COMPLEX_THOUGHT_LENGTH } from './complex-thought.js';

describe('isComplexThought', () => {
  describe('empty / blank input', () => {
    it('returns false for empty string', () => {
      expect(isComplexThought('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isComplexThought('   ')).toBe(false);
    });

    it('returns false for tab and newline string', () => {
      expect(isComplexThought('\n\t')).toBe(false);
    });
  });

  describe('length threshold (default 200)', () => {
    it('returns false for string exactly at threshold', () => {
      const thought = 'a'.repeat(DEFAULT_COMPLEX_THOUGHT_LENGTH);
      expect(isComplexThought(thought)).toBe(false);
    });

    it('returns true for string one character over threshold', () => {
      const thought = 'a'.repeat(DEFAULT_COMPLEX_THOUGHT_LENGTH + 1);
      expect(isComplexThought(thought)).toBe(true);
    });

    it('returns false for short string without question mark', () => {
      expect(isComplexThought('A short thought.')).toBe(false);
    });

    it('uses raw length, not trimmed (whitespace-only trips the blank check first)', () => {
      // All-whitespace beyond threshold: trim().length === 0 → not complex
      const whitespace = ' '.repeat(DEFAULT_COMPLEX_THOUGHT_LENGTH + 1);
      expect(isComplexThought(whitespace)).toBe(false);
    });
  });

  describe('question mark detection', () => {
    it('returns true for string containing a question mark', () => {
      expect(isComplexThought('Is this a good idea?')).toBe(true);
    });

    it('returns true for a single question mark character', () => {
      expect(isComplexThought('?')).toBe(true);
    });

    it('returns false when detectQuestions is false and string is short', () => {
      expect(isComplexThought('Is this complex?', { detectQuestions: false })).toBe(false);
    });

    it('returns false for string without question mark and below threshold', () => {
      expect(isComplexThought('No question here.')).toBe(false);
    });
  });

  describe('custom length threshold', () => {
    it('triggers on strings exceeding a small custom threshold', () => {
      expect(isComplexThought('Hello', { lengthThreshold: 3 })).toBe(true);
    });

    it('returns false when string is exactly at custom threshold', () => {
      expect(isComplexThought('12345', { lengthThreshold: 5 })).toBe(false);
    });

    it('returns true when string is one over custom threshold', () => {
      expect(isComplexThought('123456', { lengthThreshold: 5 })).toBe(true);
    });
  });

  describe('combined config', () => {
    it('returns false when detectQuestions:false and below threshold', () => {
      expect(isComplexThought('Short question?', { detectQuestions: false, lengthThreshold: 200 })).toBe(false);
    });

    it('returns true when length exceeds threshold regardless of detectQuestions', () => {
      const long = 'a'.repeat(DEFAULT_COMPLEX_THOUGHT_LENGTH + 1);
      expect(isComplexThought(long, { detectQuestions: false })).toBe(true);
    });
  });
});
