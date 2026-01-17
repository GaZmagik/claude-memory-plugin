/**
 * T013: Unit test for Memory entity validation
 *
 * Tests validation of Memory entity fields and structure.
 */

import { describe, it, expect } from 'vitest';
import {
  validateMemory,
  validateFrontmatter,
  isValidMemoryType,
  isValidScope,
  isValidSeverity,
  isValidTitle,
  isValidTags,
} from '../core/validation.js';
import { MemoryType, Severity } from './enums.js';
import type { MemoryFrontmatter } from './memory.js';

describe('isValidMemoryType', () => {
  it('should return true for valid memory types', () => {
    expect(isValidMemoryType('decision')).toBe(true);
    expect(isValidMemoryType('learning')).toBe(true);
    expect(isValidMemoryType('artifact')).toBe(true);
    expect(isValidMemoryType('gotcha')).toBe(true);
    expect(isValidMemoryType('breadcrumb')).toBe(true);
    expect(isValidMemoryType('hub')).toBe(true);
  });

  it('should return false for invalid memory types', () => {
    expect(isValidMemoryType('invalid')).toBe(false);
    expect(isValidMemoryType('')).toBe(false);
    expect(isValidMemoryType('DECISION')).toBe(false);
  });
});

describe('isValidScope', () => {
  it('should return true for valid scopes', () => {
    expect(isValidScope('enterprise')).toBe(true);
    expect(isValidScope('local')).toBe(true);
    expect(isValidScope('project')).toBe(true);
    expect(isValidScope('global')).toBe(true);
  });

  it('should return false for invalid scopes', () => {
    expect(isValidScope('invalid')).toBe(false);
    expect(isValidScope('')).toBe(false);
    expect(isValidScope('GLOBAL')).toBe(false);
  });
});

describe('isValidSeverity', () => {
  it('should return true for valid severity levels', () => {
    expect(isValidSeverity('low')).toBe(true);
    expect(isValidSeverity('medium')).toBe(true);
    expect(isValidSeverity('high')).toBe(true);
  });

  it('should return false for invalid severity levels', () => {
    expect(isValidSeverity('invalid')).toBe(false);
    expect(isValidSeverity('')).toBe(false);
    expect(isValidSeverity('HIGH')).toBe(false);
  });
});

describe('isValidTitle', () => {
  it('should return true for non-empty strings', () => {
    expect(isValidTitle('Valid Title')).toBe(true);
    expect(isValidTitle('A')).toBe(true);
  });

  it('should return false for empty or non-string values', () => {
    expect(isValidTitle('')).toBe(false);
    expect(isValidTitle('   ')).toBe(false);
    expect(isValidTitle(null)).toBe(false);
    expect(isValidTitle(123)).toBe(false);
  });
});

describe('isValidTags', () => {
  it('should return true for valid tag arrays', () => {
    expect(isValidTags(['tag1', 'tag2'])).toBe(true);
    expect(isValidTags([])).toBe(true);
  });

  it('should return false for invalid tag arrays', () => {
    expect(isValidTags('not-array')).toBe(false);
    expect(isValidTags([123, 'valid'])).toBe(false);
    expect(isValidTags(['', 'valid'])).toBe(false);
  });
});

describe('validateFrontmatter', () => {
  it('should pass for valid frontmatter', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Decision,
      title: 'Valid Decision',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: ['test'],
    };

    const result = validateFrontmatter(frontmatter);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for missing type', () => {
    const frontmatter = {
      title: 'Missing Type',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: [],
    } as unknown as MemoryFrontmatter;

    const result = validateFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'type')).toBe(true);
  });

  it('should fail for missing title', () => {
    const frontmatter = {
      type: MemoryType.Learning,
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: [],
    } as unknown as MemoryFrontmatter;

    const result = validateFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'title')).toBe(true);
  });

  it('should fail for invalid timestamp format', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Artifact,
      title: 'Invalid Timestamp',
      created: 'not-a-date',
      updated: '2026-01-10T12:00:00Z',
      tags: [],
    };

    const result = validateFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'created')).toBe(true);
  });

  it('should fail for invalid severity value', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Gotcha,
      title: 'Invalid Severity',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: [],
      severity: 'invalid' as Severity,
    };

    const result = validateFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'severity')).toBe(true);
  });

  it('should validate tags are strings', () => {
    const frontmatter = {
      type: MemoryType.Learning,
      title: 'Invalid Tags',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: [123, 'valid'],
    } as unknown as MemoryFrontmatter;

    const result = validateFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'tags')).toBe(true);
  });
});

describe('validateMemory', () => {
  it('should pass for valid memory', () => {
    const id = 'decision-valid-memory';
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Decision,
      title: 'Valid Memory',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: ['valid'],
    };
    const content = '# Valid Memory\n\nThis is valid content.';

    const result = validateMemory(id, frontmatter, content);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for missing id', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Learning,
      title: 'No ID',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: [],
    };

    const result = validateMemory('', frontmatter, 'Content');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'id')).toBe(true);
  });

  it('should fail for invalid id format', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Artifact,
      title: 'Bad ID',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: [],
    };

    const result = validateMemory('invalid-id-no-type-prefix', frontmatter, 'Content');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'id')).toBe(true);
  });

  it('should include frontmatter validation errors', () => {
    const frontmatter = {
      type: 'invalid-type',
      title: '',
      created: 'not-a-date',
      updated: '2026-01-10T12:00:00Z',
      tags: [],
    } as unknown as MemoryFrontmatter;

    const result = validateMemory('decision-test', frontmatter, 'Content');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('should fail for non-string content', () => {
    const frontmatter: MemoryFrontmatter = {
      type: MemoryType.Decision,
      title: 'Valid Title',
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: [],
    };

    const result = validateMemory('decision-test', frontmatter, 123 as unknown as string);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'content')).toBe(true);
  });
});
