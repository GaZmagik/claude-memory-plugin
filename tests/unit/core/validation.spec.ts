/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  isValidTitle,
  isValidMemoryType,
  isValidScope,
  isValidSeverity,
  isValidTags,
  isValidTimestamp,
  isValidMemoryId,
  isValidLinks,
  validateWriteRequest,
  validateFrontmatter,
} from '../../../skills/memory/src/core/validation.js';
import { MemoryType, Scope, Severity } from '../../../skills/memory/src/types/enums.js';

describe('Validation', () => {
  describe('isValidTitle', () => {
    it('should return true for valid title', () => {
      expect(isValidTitle('My Title')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidTitle('')).toBe(false);
      expect(isValidTitle('   ')).toBe(false);
    });

    it('should return false for non-string', () => {
      expect(isValidTitle(null)).toBe(false);
      expect(isValidTitle(undefined)).toBe(false);
      expect(isValidTitle(123)).toBe(false);
    });
  });

  describe('isValidMemoryType', () => {
    it('should return true for valid types', () => {
      expect(isValidMemoryType(MemoryType.Decision)).toBe(true);
      expect(isValidMemoryType(MemoryType.Learning)).toBe(true);
      expect(isValidMemoryType(MemoryType.Artifact)).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(isValidMemoryType('invalid')).toBe(false);
      expect(isValidMemoryType(null)).toBe(false);
    });
  });

  describe('isValidScope', () => {
    it('should return true for valid scopes', () => {
      expect(isValidScope(Scope.Local)).toBe(true);
      expect(isValidScope(Scope.Global)).toBe(true);
      expect(isValidScope(Scope.Project)).toBe(true);
    });

    it('should return false for invalid scopes', () => {
      expect(isValidScope('invalid')).toBe(false);
      expect(isValidScope(null)).toBe(false);
    });
  });

  describe('isValidSeverity', () => {
    it('should return true for valid severities', () => {
      expect(isValidSeverity(Severity.Low)).toBe(true);
      expect(isValidSeverity(Severity.Medium)).toBe(true);
      expect(isValidSeverity(Severity.High)).toBe(true);
    });

    it('should return false for invalid severities', () => {
      expect(isValidSeverity('invalid')).toBe(false);
      expect(isValidSeverity(null)).toBe(false);
    });
  });

  describe('isValidTags', () => {
    it('should return true for valid tags array', () => {
      expect(isValidTags(['tag1', 'tag2'])).toBe(true);
      expect(isValidTags([])).toBe(true);
    });

    it('should return false for non-array', () => {
      expect(isValidTags('tag')).toBe(false);
      expect(isValidTags(null)).toBe(false);
    });

    it('should return false for array with invalid items', () => {
      expect(isValidTags(['valid', ''])).toBe(false);
      expect(isValidTags(['valid', 123 as unknown as string])).toBe(false);
    });
  });

  describe('isValidTimestamp', () => {
    it('should return true for valid ISO timestamp', () => {
      expect(isValidTimestamp('2026-01-11T12:00:00Z')).toBe(true);
      expect(isValidTimestamp(new Date().toISOString())).toBe(true);
    });

    it('should return false for non-string', () => {
      expect(isValidTimestamp(null)).toBe(false);
      expect(isValidTimestamp(123456789)).toBe(false);
      expect(isValidTimestamp(undefined)).toBe(false);
    });

    it('should return false for invalid date string', () => {
      expect(isValidTimestamp('not-a-date')).toBe(false);
    });
  });

  describe('isValidMemoryId', () => {
    it('should return true for valid memory IDs', () => {
      expect(isValidMemoryId('decision-my-choice')).toBe(true);
      expect(isValidMemoryId('learning-something-new')).toBe(true);
      expect(isValidMemoryId('artifact-code-pattern')).toBe(true);
    });

    it('should return false for empty or non-string', () => {
      expect(isValidMemoryId('')).toBe(false);
      expect(isValidMemoryId('   ')).toBe(false);
      expect(isValidMemoryId(null)).toBe(false);
    });

    it('should return false for IDs without valid prefix', () => {
      expect(isValidMemoryId('invalid-prefix-id')).toBe(false);
      expect(isValidMemoryId('my-decision')).toBe(false);
    });
  });

  describe('isValidLinks', () => {
    it('should return true for valid links array', () => {
      expect(isValidLinks(['link1', 'link2'])).toBe(true);
      expect(isValidLinks([])).toBe(true);
    });

    it('should return false for non-array', () => {
      expect(isValidLinks('link')).toBe(false);
      expect(isValidLinks(null)).toBe(false);
      expect(isValidLinks(undefined)).toBe(false);
    });

    it('should return false for array with invalid items', () => {
      expect(isValidLinks(['valid', ''])).toBe(false);
      expect(isValidLinks(['valid', 123 as unknown as string])).toBe(false);
    });
  });

  describe('validateWriteRequest', () => {
    const validRequest = {
      title: 'Test',
      type: MemoryType.Decision,
      content: 'Content',
      tags: ['tag'],
      scope: Scope.Local,
    };

    it('should return valid for correct request', () => {
      const result = validateWriteRequest(validRequest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for invalid title', () => {
      const result = validateWriteRequest({ ...validRequest, title: '' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'title')).toBe(true);
    });

    it('should return error for invalid type', () => {
      const result = validateWriteRequest({ ...validRequest, type: 'invalid' as MemoryType });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'type')).toBe(true);
    });

    it('should return error for invalid content', () => {
      const result = validateWriteRequest({ ...validRequest, content: 123 as unknown as string });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'content')).toBe(true);
    });

    it('should return error for invalid tags', () => {
      const result = validateWriteRequest({ ...validRequest, tags: 'not-array' as unknown as string[] });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'tags')).toBe(true);
    });

    it('should return error for invalid scope', () => {
      const result = validateWriteRequest({ ...validRequest, scope: 'invalid' as Scope });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'scope')).toBe(true);
    });

    it('should return error for invalid severity when provided', () => {
      const result = validateWriteRequest({ ...validRequest, severity: 'invalid' as Severity });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'severity')).toBe(true);
    });

    it('should return error for invalid links when provided', () => {
      const result = validateWriteRequest({ ...validRequest, links: 'not-array' as unknown as string[] });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'links')).toBe(true);
    });

    it('should accept valid severity', () => {
      const result = validateWriteRequest({ ...validRequest, severity: Severity.High });
      expect(result.valid).toBe(true);
    });

    it('should accept valid links', () => {
      const result = validateWriteRequest({ ...validRequest, links: ['decision-other'] });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateFrontmatter', () => {
    const validFrontmatter = {
      type: MemoryType.Decision,
      title: 'Test',
      created: '2026-01-11T12:00:00Z',
      updated: '2026-01-11T12:00:00Z',
      tags: ['tag'],
    };

    it('should return valid for correct frontmatter', () => {
      const result = validateFrontmatter(validFrontmatter);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for non-object frontmatter', () => {
      const result = validateFrontmatter(null);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'frontmatter')).toBe(true);
    });

    it('should return error for string frontmatter', () => {
      const result = validateFrontmatter('not an object');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'frontmatter')).toBe(true);
    });

    it('should return error for invalid updated timestamp', () => {
      const result = validateFrontmatter({ ...validFrontmatter, updated: 'not-a-date' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'updated')).toBe(true);
    });

    it('should return error for invalid created timestamp', () => {
      const result = validateFrontmatter({ ...validFrontmatter, created: null });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'created')).toBe(true);
    });

    it('should return error for invalid type', () => {
      const result = validateFrontmatter({ ...validFrontmatter, type: 'invalid' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'type')).toBe(true);
    });

    it('should return error for invalid title', () => {
      const result = validateFrontmatter({ ...validFrontmatter, title: '' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'title')).toBe(true);
    });

    it('should return error for invalid tags', () => {
      const result = validateFrontmatter({ ...validFrontmatter, tags: 'not-array' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'tags')).toBe(true);
    });

    it('should return error for invalid severity when provided', () => {
      const result = validateFrontmatter({ ...validFrontmatter, severity: 'invalid' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'severity')).toBe(true);
    });
  });
});
