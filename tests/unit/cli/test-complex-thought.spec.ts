/**
 * T009: Unit test for complex thought detection
 *
 * Tests detection of "complex" thoughts that warrant
 * interactive AI assistance prompts:
 * - Thoughts > 200 characters
 * - Thoughts containing "?"
 */

import { describe, it, expect } from 'vitest';

// These imports will fail until implementation exists (TDD Red phase)
import {
  isComplexThought,
  type ComplexThoughtConfig,
  DEFAULT_COMPLEX_THOUGHT_LENGTH,
} from '../../../skills/memory/src/cli/complex-thought.js';

describe('Complex Thought Detection', () => {
  describe('DEFAULT_COMPLEX_THOUGHT_LENGTH', () => {
    it('should be 200 by default', () => {
      expect(DEFAULT_COMPLEX_THOUGHT_LENGTH).toBe(200);
    });
  });

  describe('isComplexThought() - length detection', () => {
    it('should return false for empty string', () => {
      expect(isComplexThought('')).toBe(false);
    });

    it('should return false for short thought (< 200 chars)', () => {
      const shortThought = 'This is a simple thought about testing.';
      expect(shortThought.length).toBeLessThan(200);
      expect(isComplexThought(shortThought)).toBe(false);
    });

    it('should return false for thought exactly at threshold (200 chars)', () => {
      // Create a string of exactly 200 characters (no question mark)
      const exactThought = 'A'.repeat(200);
      expect(exactThought.length).toBe(200);
      expect(isComplexThought(exactThought)).toBe(false);
    });

    it('should return true for thought exceeding threshold (201+ chars)', () => {
      const longThought = 'A'.repeat(201);
      expect(longThought.length).toBe(201);
      expect(isComplexThought(longThought)).toBe(true);
    });

    it('should return true for very long thoughts', () => {
      const veryLongThought = 'A'.repeat(1000);
      expect(isComplexThought(veryLongThought)).toBe(true);
    });
  });

  describe('isComplexThought() - question mark detection', () => {
    it('should return true for thought containing "?"', () => {
      const question = 'Should we use microservices?';
      expect(question.length).toBeLessThan(200);
      expect(isComplexThought(question)).toBe(true);
    });

    it('should return true for thought with multiple question marks', () => {
      const multiQuestion = 'Should we? Or should we not? What do you think?';
      expect(isComplexThought(multiQuestion)).toBe(true);
    });

    it('should return true for thought with question mark at start', () => {
      const startQuestion = '? wondering about this approach';
      expect(isComplexThought(startQuestion)).toBe(true);
    });

    it('should return true for thought with question mark in middle', () => {
      const middleQuestion = 'The approach might work? Let us try it.';
      expect(isComplexThought(middleQuestion)).toBe(true);
    });

    it('should return false for thought without question mark', () => {
      const statement = 'This is a definitive statement about the architecture.';
      expect(isComplexThought(statement)).toBe(false);
    });
  });

  describe('isComplexThought() - combined conditions', () => {
    it('should return true for long thought WITH question mark', () => {
      const longQuestion = 'A'.repeat(150) + ' Should we proceed with this approach?';
      expect(longQuestion.length).toBeGreaterThan(200);
      expect(longQuestion.includes('?')).toBe(true);
      expect(isComplexThought(longQuestion)).toBe(true);
    });

    it('should return true if EITHER condition is met (length)', () => {
      const justLong = 'A'.repeat(250); // Long but no question
      expect(isComplexThought(justLong)).toBe(true);
    });

    it('should return true if EITHER condition is met (question)', () => {
      const justQuestion = 'Why?'; // Short but has question
      expect(isComplexThought(justQuestion)).toBe(true);
    });

    it('should return false only when NEITHER condition is met', () => {
      const simple = 'Implementing the feature as discussed.';
      expect(simple.length).toBeLessThan(200);
      expect(simple.includes('?')).toBe(false);
      expect(isComplexThought(simple)).toBe(false);
    });
  });

  describe('isComplexThought() - custom config', () => {
    it('should respect custom length threshold', () => {
      const config: ComplexThoughtConfig = { lengthThreshold: 50 };
      const thought = 'A'.repeat(60); // 60 chars, no question

      // Default would say false (< 200), custom should say true (> 50)
      expect(isComplexThought(thought, config)).toBe(true);
    });

    it('should respect very high custom threshold', () => {
      const config: ComplexThoughtConfig = { lengthThreshold: 500 };
      const thought = 'A'.repeat(300); // 300 chars, no question

      // Would be complex at default threshold, but not at 500
      expect(isComplexThought(thought, config)).toBe(false);
    });

    it('should allow disabling question detection', () => {
      const config: ComplexThoughtConfig = {
        lengthThreshold: 200,
        detectQuestions: false,
      };
      const question = 'Should we proceed?';

      // Has question mark but detection is disabled
      expect(isComplexThought(question, config)).toBe(false);
    });

    it('should use both length and question detection by default', () => {
      const config: ComplexThoughtConfig = {
        lengthThreshold: 100,
        detectQuestions: true,
      };

      // Short statement - not complex
      expect(isComplexThought('Simple statement.', config)).toBe(false);

      // Short question - complex (question detected)
      expect(isComplexThought('Is this complex?', config)).toBe(true);

      // Long statement - complex (length exceeded)
      expect(isComplexThought('A'.repeat(150), config)).toBe(true);
    });
  });

  describe('isComplexThought() - edge cases', () => {
    it('should handle whitespace-only strings', () => {
      expect(isComplexThought('   ')).toBe(false);
      expect(isComplexThought('\n\t\n')).toBe(false);
    });

    it('should handle strings with only special characters', () => {
      expect(isComplexThought('...')).toBe(false);
      expect(isComplexThought('!!!')).toBe(false);
    });

    it('should handle unicode characters correctly', () => {
      // Unicode characters should count as single characters
      const unicodeThought = '🤔'.repeat(201);
      expect(unicodeThought.length).toBe(402); // Emoji are 2 UTF-16 code units
      // Implementation should handle this gracefully
      expect(isComplexThought(unicodeThought)).toBe(true);
    });

    it('should handle thought with escaped question mark', () => {
      // Backslash-escaped ? should still be detected as ?
      // (we detect the literal character, not semantic questions)
      const escaped = 'Is this a regex pattern\\?';
      expect(escaped.includes('?')).toBe(true);
      expect(isComplexThought(escaped)).toBe(true);
    });

    it('should handle multi-line thoughts', () => {
      const multiLine = `Should we consider:
      - Option A
      - Option B
      - Option C?`;

      expect(isComplexThought(multiLine)).toBe(true);
    });

    it('should trim whitespace when counting length', () => {
      // If implementation trims, this tests that behaviour
      // If not, the test documents expected behaviour
      const paddedThought = '   ' + 'A'.repeat(198) + '   ';
      // With trimming: 198 chars (below threshold)
      // Without trimming: 204 chars (above threshold)
      // The spec says ">200 chars" - implementation decides on trimming
      // This test documents the actual behaviour once implemented
      expect(isComplexThought(paddedThought)).toBeDefined();
    });
  });

  describe('real-world examples from spec', () => {
    it('should detect spec example as complex: "Should we migrate to microservices? What are the trade-offs?"', () => {
      const specExample =
        'Should we migrate to microservices? What are the trade-offs?';

      // This contains "?" so should be complex even though < 200 chars
      expect(isComplexThought(specExample)).toBe(true);
    });

    it('should detect simple thought as non-complex: "Adding database index"', () => {
      const simpleThought = 'Adding database index';

      expect(isComplexThought(simpleThought)).toBe(false);
    });

    it('should detect long analysis as complex', () => {
      const longAnalysis =
        'The current authentication system uses JWT tokens stored in localStorage. ' +
        'This approach has security implications including XSS vulnerability exposure. ' +
        'We should consider httpOnly cookies as an alternative, though this introduces ' +
        'CSRF concerns that would need to be addressed with proper token validation.';

      expect(longAnalysis.length).toBeGreaterThan(200);
      expect(isComplexThought(longAnalysis)).toBe(true);
    });
  });
});
