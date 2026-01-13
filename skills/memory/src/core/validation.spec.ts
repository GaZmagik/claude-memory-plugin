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
  validateMemory,
  isValidExportedMemory,
  isValidExportPackage,
} from './validation.js';
import { MemoryType, Scope, Severity } from '../types/enums.js';

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

    it('should return error for invalid links when provided', () => {
      const result = validateFrontmatter({ ...validFrontmatter, links: 'not-array' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'links')).toBe(true);
    });
  });

  describe('validateMemory', () => {
    const validFrontmatter = {
      type: MemoryType.Decision,
      title: 'Test Decision',
      created: '2026-01-11T12:00:00Z',
      updated: '2026-01-11T12:00:00Z',
      tags: ['test'],
      scope: Scope.Local,
    };

    it('should return valid for correct memory', () => {
      const result = validateMemory('decision-test', validFrontmatter, 'Some content');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for invalid ID', () => {
      const result = validateMemory('invalid-id', validFrontmatter, 'Content');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
    });

    it('should return error for empty ID', () => {
      const result = validateMemory('', validFrontmatter, 'Content');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
    });

    it('should return error for invalid frontmatter type', () => {
      const result = validateMemory('decision-test', { ...validFrontmatter, type: 'invalid' as MemoryType }, 'Content');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'type')).toBe(true);
    });

    it('should return error for invalid frontmatter title', () => {
      const result = validateMemory('decision-test', { ...validFrontmatter, title: '' }, 'Content');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'title')).toBe(true);
    });

    it('should return error for non-string content', () => {
      const result = validateMemory('decision-test', validFrontmatter, 123 as unknown as string);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'content')).toBe(true);
    });

    it('should aggregate multiple errors', () => {
      const result = validateMemory('invalid-id', { ...validFrontmatter, title: '' }, 123 as unknown as string);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('isValidExportedMemory', () => {
    const validExportedMemory = {
      id: 'decision-test-memory',
      content: 'Some content here',
      frontmatter: {
        type: 'decision',
        title: 'Test Memory',
        tags: ['tag1', 'tag2'],
        created: '2026-01-11T12:00:00Z',
        updated: '2026-01-11T12:00:00Z',
      },
    };

    it('should return true for valid exported memory', () => {
      expect(isValidExportedMemory(validExportedMemory)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isValidExportedMemory(null)).toBe(false);
      expect(isValidExportedMemory(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isValidExportedMemory('string')).toBe(false);
      expect(isValidExportedMemory(123)).toBe(false);
      expect(isValidExportedMemory([])).toBe(false);
    });

    it('should return false for missing id', () => {
      const { id: _, ...noId } = validExportedMemory;
      expect(isValidExportedMemory(noId)).toBe(false);
    });

    it('should return false for empty id', () => {
      expect(isValidExportedMemory({ ...validExportedMemory, id: '' })).toBe(false);
      expect(isValidExportedMemory({ ...validExportedMemory, id: '   ' })).toBe(false);
    });

    it('should return false for non-string id', () => {
      expect(isValidExportedMemory({ ...validExportedMemory, id: 123 })).toBe(false);
    });

    it('should return false for missing content', () => {
      const { content: _, ...noContent } = validExportedMemory;
      expect(isValidExportedMemory(noContent)).toBe(false);
    });

    it('should return false for non-string content', () => {
      expect(isValidExportedMemory({ ...validExportedMemory, content: 123 })).toBe(false);
    });

    it('should return false for missing frontmatter', () => {
      const { frontmatter: _, ...noFrontmatter } = validExportedMemory;
      expect(isValidExportedMemory(noFrontmatter)).toBe(false);
    });

    it('should return false for non-object frontmatter', () => {
      expect(isValidExportedMemory({ ...validExportedMemory, frontmatter: 'string' })).toBe(false);
      expect(isValidExportedMemory({ ...validExportedMemory, frontmatter: null })).toBe(false);
    });

    it('should return false for missing frontmatter.type', () => {
      const { type: _, ...noType } = validExportedMemory.frontmatter;
      expect(isValidExportedMemory({ ...validExportedMemory, frontmatter: noType })).toBe(false);
    });

    it('should return false for missing frontmatter.title', () => {
      const { title: _, ...noTitle } = validExportedMemory.frontmatter;
      expect(isValidExportedMemory({ ...validExportedMemory, frontmatter: noTitle })).toBe(false);
    });

    it('should return false for missing frontmatter.tags', () => {
      const { tags: _, ...noTags } = validExportedMemory.frontmatter;
      expect(isValidExportedMemory({ ...validExportedMemory, frontmatter: noTags })).toBe(false);
    });

    it('should return false for non-array frontmatter.tags', () => {
      expect(isValidExportedMemory({
        ...validExportedMemory,
        frontmatter: { ...validExportedMemory.frontmatter, tags: 'not-array' },
      })).toBe(false);
    });

    it('should return false for missing frontmatter.created', () => {
      const { created: _, ...noCreated } = validExportedMemory.frontmatter;
      expect(isValidExportedMemory({ ...validExportedMemory, frontmatter: noCreated })).toBe(false);
    });

    it('should return false for missing frontmatter.updated', () => {
      const { updated: _, ...noUpdated } = validExportedMemory.frontmatter;
      expect(isValidExportedMemory({ ...validExportedMemory, frontmatter: noUpdated })).toBe(false);
    });
  });

  describe('isValidExportPackage', () => {
    const validMemory = {
      id: 'decision-test-memory',
      content: 'Some content',
      frontmatter: {
        type: 'decision',
        title: 'Test',
        tags: ['tag'],
        created: '2026-01-11T12:00:00Z',
        updated: '2026-01-11T12:00:00Z',
      },
    };

    const validPackage = {
      version: '1.0.0',
      exportedAt: '2026-01-11T12:00:00Z',
      memories: [validMemory],
    };

    it('should return true for valid package without graph', () => {
      expect(isValidExportPackage(validPackage)).toBe(true);
    });

    it('should return true for valid package with empty memories', () => {
      expect(isValidExportPackage({ ...validPackage, memories: [] })).toBe(true);
    });

    it('should return true for valid package with graph', () => {
      const packageWithGraph = {
        ...validPackage,
        graph: {
          nodes: ['decision-test-memory'],
          edges: [{ source: 'decision-a', target: 'decision-b', label: 'relates-to' }],
        },
      };
      expect(isValidExportPackage(packageWithGraph)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isValidExportPackage(null)).toBe(false);
      expect(isValidExportPackage(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isValidExportPackage('string')).toBe(false);
      expect(isValidExportPackage(123)).toBe(false);
    });

    it('should return false for missing version', () => {
      const { version: _, ...noVersion } = validPackage;
      expect(isValidExportPackage(noVersion)).toBe(false);
    });

    it('should return false for non-string version', () => {
      expect(isValidExportPackage({ ...validPackage, version: 123 })).toBe(false);
    });

    it('should return false for missing exportedAt', () => {
      const { exportedAt: _, ...noExportedAt } = validPackage;
      expect(isValidExportPackage(noExportedAt)).toBe(false);
    });

    it('should return false for non-string exportedAt', () => {
      expect(isValidExportPackage({ ...validPackage, exportedAt: 123 })).toBe(false);
    });

    it('should return false for missing memories', () => {
      const { memories: _, ...noMemories } = validPackage;
      expect(isValidExportPackage(noMemories)).toBe(false);
    });

    it('should return false for non-array memories', () => {
      expect(isValidExportPackage({ ...validPackage, memories: 'not-array' })).toBe(false);
    });

    it('should return false for invalid memory in array', () => {
      expect(isValidExportPackage({
        ...validPackage,
        memories: [{ id: 'bad', content: 123 }],
      })).toBe(false);
    });

    it('should return false for invalid graph (non-object)', () => {
      expect(isValidExportPackage({ ...validPackage, graph: 'not-object' })).toBe(false);
      expect(isValidExportPackage({ ...validPackage, graph: null })).toBe(false);
    });

    it('should return false for graph with missing nodes', () => {
      expect(isValidExportPackage({
        ...validPackage,
        graph: { edges: [] },
      })).toBe(false);
    });

    it('should return false for graph with missing edges', () => {
      expect(isValidExportPackage({
        ...validPackage,
        graph: { nodes: [] },
      })).toBe(false);
    });

    it('should return false for graph with invalid edge (missing source)', () => {
      expect(isValidExportPackage({
        ...validPackage,
        graph: {
          nodes: [],
          edges: [{ target: 'b', label: 'x' }],
        },
      })).toBe(false);
    });

    it('should return false for graph with invalid edge (missing target)', () => {
      expect(isValidExportPackage({
        ...validPackage,
        graph: {
          nodes: [],
          edges: [{ source: 'a', label: 'x' }],
        },
      })).toBe(false);
    });

    it('should return false for graph with invalid edge (missing label)', () => {
      expect(isValidExportPackage({
        ...validPackage,
        graph: {
          nodes: [],
          edges: [{ source: 'a', target: 'b' }],
        },
      })).toBe(false);
    });

    it('should return false for graph with non-object edge', () => {
      expect(isValidExportPackage({
        ...validPackage,
        graph: {
          nodes: [],
          edges: ['not-an-object'],
        },
      })).toBe(false);
    });
  });
});
