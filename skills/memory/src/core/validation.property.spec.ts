/**
 * Property-Based Tests for Validation Functions
 *
 * Validates that type guards are sound and complete.
 */

import { describe, it, expect } from 'vitest';
import {
  isValidMemoryType,
  isValidScope,
  isValidSeverity,
  isValidTitle,
  isValidTags,
  isValidTimestamp,
  isValidMemoryId,
  isValidLinks,
} from './validation.js';
import { MemoryType, Scope, Severity } from '../types/enums.js';

describe('Validation Function Properties', () => {
  describe('isValidMemoryType', () => {
    it('should accept all valid MemoryType enum values', () => {
      for (const type of Object.values(MemoryType)) {
        expect(isValidMemoryType(type)).toBe(true);
      }
    });

    it('should reject invalid string values', () => {
      const invalidTypes = [
        'invalid',
        'Learning', // Wrong case
        'DECISION',
        'memory',
        '',
        'learning-extra',
      ];

      for (const type of invalidTypes) {
        expect(isValidMemoryType(type)).toBe(false);
      }
    });

    it('should reject non-string values', () => {
      const nonStrings = [null, undefined, 123, true, {}, [], Symbol('test')];

      for (const value of nonStrings) {
        expect(isValidMemoryType(value)).toBe(false);
      }
    });

    it('should be deterministic', () => {
      const testValues = [...Object.values(MemoryType), 'invalid', null, 123];

      for (const value of testValues) {
        expect(isValidMemoryType(value)).toBe(isValidMemoryType(value));
      }
    });
  });

  describe('isValidScope', () => {
    it('should accept all valid Scope enum values', () => {
      for (const scope of Object.values(Scope)) {
        expect(isValidScope(scope)).toBe(true);
      }
    });

    it('should reject invalid values', () => {
      const invalidScopes = ['invalid', 'Local', 'GLOBAL', '', null, 123];

      for (const scope of invalidScopes) {
        expect(isValidScope(scope)).toBe(false);
      }
    });
  });

  describe('isValidSeverity', () => {
    it('should accept all valid Severity enum values', () => {
      for (const severity of Object.values(Severity)) {
        expect(isValidSeverity(severity)).toBe(true);
      }
    });

    it('should reject invalid values', () => {
      const invalidSeverities = ['invalid', 'High', 'LOW', '', null];

      for (const severity of invalidSeverities) {
        expect(isValidSeverity(severity)).toBe(false);
      }
    });
  });

  describe('isValidTitle', () => {
    it('should accept non-empty strings', () => {
      const validTitles = [
        'a',
        'Hello World',
        '  trimmed  ', // Has content after trim
        '日本語',
        '🎉 Emoji Title',
        'a'.repeat(1000),
      ];

      for (const title of validTitles) {
        expect(isValidTitle(title)).toBe(true);
      }
    });

    it('should reject empty or whitespace-only strings', () => {
      const invalidTitles = ['', '   ', '\t\n', '    '];

      for (const title of invalidTitles) {
        expect(isValidTitle(title)).toBe(false);
      }
    });

    it('should reject non-string values', () => {
      const nonStrings = [null, undefined, 123, true, {}, []];

      for (const value of nonStrings) {
        expect(isValidTitle(value)).toBe(false);
      }
    });
  });

  describe('isValidTags', () => {
    it('should accept arrays of non-empty strings', () => {
      const validTagArrays = [
        ['tag1'],
        ['a', 'b', 'c'],
        ['typescript', 'testing', 'property-based'],
        ['日本語', 'emoji🎉'],
      ];

      for (const tags of validTagArrays) {
        expect(isValidTags(tags)).toBe(true);
      }
    });

    it('should accept empty arrays', () => {
      expect(isValidTags([])).toBe(true);
    });

    it('should reject arrays with empty strings', () => {
      const invalidTagArrays = [
        [''],
        ['valid', ''],
        ['', 'valid'],
        ['valid', '   ', 'also-valid'], // Whitespace-only
      ];

      for (const tags of invalidTagArrays) {
        expect(isValidTags(tags)).toBe(false);
      }
    });

    it('should reject non-array values', () => {
      const nonArrays = [null, undefined, 'string', 123, {}, { 0: 'a' }];

      for (const value of nonArrays) {
        expect(isValidTags(value)).toBe(false);
      }
    });

    it('should reject arrays with non-string elements', () => {
      const invalidArrays = [
        [123],
        ['valid', 123],
        [null],
        [undefined],
        [{}],
      ];

      for (const arr of invalidArrays) {
        expect(isValidTags(arr)).toBe(false);
      }
    });
  });

  describe('isValidTimestamp', () => {
    it('should accept valid ISO 8601 timestamps', () => {
      const validTimestamps = [
        '2024-01-15T10:30:00Z',
        '2024-01-15T10:30:00.000Z',
        '2024-01-15',
        '2024-01-15T10:30:00+00:00',
        new Date().toISOString(),
      ];

      for (const ts of validTimestamps) {
        expect(isValidTimestamp(ts)).toBe(true);
      }
    });

    it('should reject invalid date strings', () => {
      const invalidTimestamps = [
        'not-a-date',
        '2024-13-45', // Invalid month/day
        '',
        'yesterday',
      ];

      for (const ts of invalidTimestamps) {
        expect(isValidTimestamp(ts)).toBe(false);
      }
    });

    it('should reject non-string values', () => {
      const nonStrings = [null, undefined, 123, new Date(), {}];

      for (const value of nonStrings) {
        expect(isValidTimestamp(value)).toBe(false);
      }
    });
  });

  describe('isValidMemoryId', () => {
    it('should accept IDs with valid type prefixes', () => {
      const validIds = Object.values(MemoryType).map(type => `${type}-test-id`);

      for (const id of validIds) {
        expect(isValidMemoryId(id)).toBe(true);
      }
    });

    it('should reject IDs without type prefix', () => {
      const invalidIds = [
        'test-id',
        'no-prefix',
        'Learning-wrong-case',
        '',
        '   ',
      ];

      for (const id of invalidIds) {
        expect(isValidMemoryId(id)).toBe(false);
      }
    });

    it('should reject non-string values', () => {
      const nonStrings = [null, undefined, 123, {}];

      for (const value of nonStrings) {
        expect(isValidMemoryId(value)).toBe(false);
      }
    });
  });

  describe('isValidLinks', () => {
    it('should behave identically to isValidTags for arrays', () => {
      const testCases = [
        [],
        ['link1'],
        ['a', 'b', 'c'],
        [''], // Should be invalid
        ['valid', ''], // Should be invalid
      ];

      for (const testCase of testCases) {
        expect(isValidLinks(testCase)).toBe(isValidTags(testCase));
      }
    });
  });
});
