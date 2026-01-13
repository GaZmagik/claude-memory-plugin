/**
 * Property-based tests for slug.ts
 *
 * These tests verify mathematical properties and invariants that should hold
 * for all inputs, not just specific test cases.
 */

import { describe, it, expect } from 'vitest';
import { slugify, generateSlug, resolveCollision, isValidSlug, parseId } from './slug.js';
import { MemoryType } from '../types/enums.js';

describe('slug property-based tests', () => {
  describe('slugify invariants', () => {
    it('should always return lowercase strings', () => {
      const testCases = [
        'UPPERCASE',
        'MixedCase',
        'lowercase',
        'CamelCaseString',
        'SCREAMING_SNAKE_CASE',
      ];

      for (const input of testCases) {
        const result = slugify(input);
        expect(result).toBe(result.toLowerCase());
      }
    });

    it('should be idempotent - slugify(slugify(x)) === slugify(x)', () => {
      const testCases = [
        'Test String',
        'Multiple   Spaces',
        'Special!@#$%Characters',
        'Ñoño Español',
        'already-slugified',
      ];

      for (const input of testCases) {
        const once = slugify(input);
        const twice = slugify(once);
        expect(twice).toBe(once);
      }
    });

    it('should never contain spaces', () => {
      const testCases = [
        'has spaces',
        'multiple   spaces',
        '  leading and trailing  ',
        'tab\tcharacter',
      ];

      for (const input of testCases) {
        const result = slugify(input);
        expect(result).not.toContain(' ');
        expect(result).not.toContain('\t');
      }
    });

    it('should never start or end with hyphens', () => {
      const testCases = [
        '-leading',
        'trailing-',
        '--both--',
        '---multiple---',
        'normal-slug',
      ];

      for (const input of testCases) {
        const result = slugify(input);
        expect(result).not.toMatch(/^-/);
        expect(result).not.toMatch(/-$/);
      }
    });

    it('should never contain consecutive hyphens', () => {
      const testCases = [
        'double--hyphen',
        'triple---hyphen',
        'multiple  spaces',
        'special---characters!!!',
      ];

      for (const input of testCases) {
        const result = slugify(input);
        expect(result).not.toContain('--');
      }
    });

    it('should only contain valid slug characters [a-z0-9-]', () => {
      const testCases = [
        'Valid123',
        'Special!@#$Characters',
        'Ñoño',
        'Emoji 😀',
        'Under_score',
      ];

      for (const input of testCases) {
        const result = slugify(input);
        expect(result).toMatch(/^[a-z0-9-]*$/);
      }
    });

    it('should preserve relative ordering of alphanumeric characters', () => {
      const input = 'ABC123def';
      const result = slugify(input);

      // Extract only alphanumeric characters from result
      const alphanumeric = result.replace(/-/g, '');
      expect(alphanumeric).toBe('abc123def');
    });
  });

  describe('generateSlug properties', () => {
    it('should always include type prefix when provided', () => {
      const types = ['learning', 'gotcha', 'decision', 'artifact'];
      const titles = ['Test', 'Another Test', 'Third Test'];

      for (const type of types) {
        for (const title of titles) {
          const result = generateSlug(title, type);
          expect(result).toMatch(new RegExp(`^${type}-`));
        }
      }
    });

    it('should handle empty titles consistently', () => {
      const emptyInputs = ['', '   ', '\t\t', '   \n   '];

      for (const input of emptyInputs) {
        const withType = generateSlug(input, 'learning');
        const withoutType = generateSlug(input);

        expect(withType).toBe('learning-untitled');
        expect(withoutType).toBe('untitled');
      }
    });

    it('should respect maximum length constraint', () => {
      const longTitle = 'a'.repeat(200);
      const result = generateSlug(longTitle);

      expect(result.length).toBeLessThanOrEqual(80);
    });

    it('should not end with hyphen even after truncation', () => {
      const titlesThatMightCauseIssues = [
        'Very Long Title That Needs Truncation ' + 'word '.repeat(20),
        'a'.repeat(100) + '---',
        'Long' + ' '.repeat(100) + 'Title',
      ];

      for (const title of titlesThatMightCauseIssues) {
        const result = generateSlug(title);
        expect(result).not.toMatch(/-$/);
      }
    });
  });

  describe('resolveCollision properties', () => {
    it('should never return a slug that exists in the list', () => {
      const existingSlugs = ['test-slug', 'test-slug-1', 'test-slug-2'];
      const result = resolveCollision('test-slug', existingSlugs);

      expect(existingSlugs).not.toContain(result);
    });

    it('should return original slug when no collision exists', () => {
      const slug = 'unique-slug';
      const existingSlugs = ['other-slug', 'another-slug'];
      const result = resolveCollision(slug, existingSlugs);

      expect(result).toBe(slug);
    });

    it('should always append numeric suffix for collisions', () => {
      const existingSlugs = ['test'];
      const result = resolveCollision('test', existingSlugs);

      expect(result).toMatch(/^test-\d+$/);
    });

    it('should find lowest available suffix', () => {
      const existingSlugs = ['slug', 'slug-1', 'slug-2'];
      const result = resolveCollision('slug', existingSlugs);

      expect(result).toBe('slug-3');
    });

    it('should handle gaps in suffix sequence', () => {
      const existingSlugs = ['slug', 'slug-1', 'slug-3'];
      const result = resolveCollision('slug', existingSlugs);

      // Should find the first available, which is slug-2
      expect(existingSlugs).not.toContain(result);
      expect(result).toMatch(/^slug-\d+$/);
    });
  });

  describe('isValidSlug properties', () => {
    it('should reject empty or whitespace strings', () => {
      const invalidInputs = ['', '   ', '\t', '\n'];

      for (const input of invalidInputs) {
        expect(isValidSlug(input)).toBe(false);
      }
    });

    it('should accept slugify output', () => {
      const testInputs = [
        'Test String',
        'Multiple Words Here',
        'Special!@#Characters',
        'Numbers123',
      ];

      for (const input of testInputs) {
        const slug = slugify(input);
        if (slug.length > 0) {
          expect(isValidSlug(slug)).toBe(true);
        }
      }
    });

    it('should be consistent with slugification rules', () => {
      const invalidSlugs = [
        'UPPERCASE',
        'has spaces',
        '-leading-hyphen',
        'trailing-hyphen-',
        'double--hyphen',
        'special!chars',
      ];

      for (const slug of invalidSlugs) {
        expect(isValidSlug(slug)).toBe(false);
      }
    });
  });

  describe('parseId properties', () => {
    it('should be inverse of generateId for valid types', () => {
      const types = [
        MemoryType.Learning,
        MemoryType.Gotcha,
        MemoryType.Decision,
        MemoryType.Artifact,
      ];
      const slug = 'test-slug';

      for (const type of types) {
        const id = `${type}-${slug}`;
        const parsed = parseId(id);

        expect(parsed).not.toBeNull();
        expect(parsed?.type).toBe(type);
        expect(parsed?.slug).toBe(slug);
      }
    });

    it('should return null for invalid IDs', () => {
      const invalidIds = [
        'no-type-prefix',
        'invalid-type-slug',
        'just-slug',
        '',
      ];

      for (const id of invalidIds) {
        const result = parseId(id);
        expect(result).toBeNull();
      }
    });

    it('should handle slugs containing type name', () => {
      // e.g., "learning-learning-python" should parse correctly
      const id = 'learning-learning-python';
      const parsed = parseId(id);

      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe(MemoryType.Learning);
      expect(parsed?.slug).toBe('learning-python');
    });
  });

  describe('cross-function invariants', () => {
    it('generateSlug output should always be valid', () => {
      const testCases = [
        'Normal Title',
        'Special!@#$',
        'VeryLongTitle' + 'x'.repeat(100),
        '123 Numbers',
        'Ñoño España',
      ];

      for (const title of testCases) {
        const slug = generateSlug(title);
        if (slug !== 'untitled') {
          expect(isValidSlug(slug)).toBe(true);
        }
      }
    });

    it('resolveCollision should always return valid slug', () => {
      const testCases = [
        { slug: 'valid-slug', existing: ['valid-slug'] },
        { slug: 'test', existing: ['test', 'test-1', 'test-2'] },
        { slug: 'another', existing: [] },
      ];

      for (const { slug, existing } of testCases) {
        const result = resolveCollision(slug, existing);
        expect(isValidSlug(result)).toBe(true);
      }
    });
  });

  describe('length properties', () => {
    it('slugify should never increase length beyond normalization', () => {
      const testCases = [
        'short',
        'medium length string',
        'very long string with many words that should be processed',
      ];

      for (const input of testCases) {
        const result = slugify(input);
        // After removing spaces and special chars, length should not exceed input
        const normalizedInput = input.toLowerCase().replace(/[^a-z0-9]/g, '');
        expect(result.replace(/-/g, '').length).toBeLessThanOrEqual(normalizedInput.length);
      }
    });
  });

  describe('unicode handling', () => {
    it('should normalize diacritics consistently', () => {
      const testPairs = [
        ['café', 'cafe'],
        ['naïve', 'naive'],
        ['Ñoño', 'nono'],
        ['résumé', 'resume'],
      ];

      for (const [input, expected] of testPairs) {
        const result = slugify(input);
        expect(result).toBe(expected);
      }
    });

    it('should remove emoji and special unicode', () => {
      const testCases = [
        'Test 😀 emoji',
        '中文字符',
        'Emoji 🎉 party',
        '日本語',
      ];

      for (const input of testCases) {
        const result = slugify(input);
        expect(result).toMatch(/^[a-z0-9-]*$/);
      }
    });
  });
});
