/**
 * T013: Unit test for Memory entity validation
 *
 * Tests validation of Memory entity fields and structure.
 */

import { describe, it, expect } from 'vitest';
import { validateMemory, validateFrontmatter, isValidMemoryType, isValidScope } from '../../../skills/memory/src/core/validation.js';
import { MemoryType, Scope, Severity } from '../../../skills/memory/src/types/enums.js';
import type { Memory, MemoryFrontmatter } from '../../../skills/memory/src/types/memory.js';

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
    } as MemoryFrontmatter;

    const result = validateFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('type is required');
  });

  it('should fail for missing title', () => {
    const frontmatter = {
      type: MemoryType.Learning,
      created: '2026-01-10T12:00:00Z',
      updated: '2026-01-10T12:00:00Z',
      tags: [],
    } as MemoryFrontmatter;

    const result = validateFrontmatter(frontmatter);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('title is required');
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
    expect(result.errors.some(e => e.includes('created'))).toBe(true);
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
    expect(result.errors.some(e => e.includes('severity'))).toBe(true);
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
    expect(result.errors.some(e => e.includes('tag'))).toBe(true);
  });
});

describe('validateMemory', () => {
  it('should pass for valid memory', () => {
    const memory: Memory = {
      id: 'valid-memory',
      frontmatter: {
        type: MemoryType.Decision,
        title: 'Valid Memory',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: ['valid'],
      },
      content: '# Valid Memory\n\nThis is valid content.',
      scope: Scope.Global,
      filePath: '/home/user/.claude/memory/permanent/decision-valid-memory.md',
    };

    const result = validateMemory(memory);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for missing id', () => {
    const memory = {
      frontmatter: {
        type: MemoryType.Learning,
        title: 'No ID',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
      },
      content: 'Content',
      scope: Scope.Global,
      filePath: '/path/to/file.md',
    } as Memory;

    const result = validateMemory(memory);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('id is required');
  });

  it('should fail for invalid scope', () => {
    const memory: Memory = {
      id: 'bad-scope',
      frontmatter: {
        type: MemoryType.Artifact,
        title: 'Bad Scope',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
      },
      content: 'Content',
      scope: 'invalid' as Scope,
      filePath: '/path/to/file.md',
    };

    const result = validateMemory(memory);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('scope'))).toBe(true);
  });

  it('should fail for empty content when type requires it', () => {
    const memory: Memory = {
      id: 'empty-content',
      frontmatter: {
        type: MemoryType.Decision,
        title: 'Empty Content',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
      },
      content: '',
      scope: Scope.Global,
      filePath: '/path/to/file.md',
    };

    const result = validateMemory(memory);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('content'))).toBe(true);
  });

  it('should allow empty content for breadcrumbs', () => {
    const memory: Memory = {
      id: 'empty-breadcrumb',
      frontmatter: {
        type: MemoryType.Breadcrumb,
        title: 'Empty Breadcrumb',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
      },
      content: '',
      scope: Scope.Global,
      filePath: '/path/to/file.md',
    };

    const result = validateMemory(memory);
    expect(result.valid).toBe(true);
  });
});
