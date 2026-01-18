/**
 * Unit tests for pattern matcher
 */

import { describe, it, expect } from 'vitest';
import { memoryId } from '../test-utils/branded-helpers.js';
import {
  matchGlobPattern,
  matchTags,
  filterMemories,
  countMatches,
} from './pattern-matcher.js';
import { MemoryType, Scope } from '../types/enums.js';
import type { IndexEntry } from '../types/memory.js';

describe('matchGlobPattern', () => {
  it('should match exact strings', () => {
    expect(matchGlobPattern('decision-foo', 'decision-foo')).toBe(true);
    expect(matchGlobPattern('decision-foo', 'decision-bar')).toBe(false);
  });

  it('should match wildcard *', () => {
    expect(matchGlobPattern('decision-*', 'decision-foo')).toBe(true);
    expect(matchGlobPattern('decision-*', 'decision-bar')).toBe(true);
    expect(matchGlobPattern('decision-*', 'learning-foo')).toBe(false);
  });

  it('should match prefix wildcard', () => {
    expect(matchGlobPattern('*-foo', 'decision-foo')).toBe(true);
    expect(matchGlobPattern('*-foo', 'learning-foo')).toBe(true);
    expect(matchGlobPattern('*-foo', 'decision-bar')).toBe(false);
  });

  it('should match wildcard in middle', () => {
    expect(matchGlobPattern('decision-*-v1', 'decision-foo-v1')).toBe(true);
    expect(matchGlobPattern('decision-*-v1', 'decision-bar-v1')).toBe(true);
    expect(matchGlobPattern('decision-*-v1', 'decision-foo-v2')).toBe(false);
  });

  it('should match single character ?', () => {
    expect(matchGlobPattern('decision-fo?', 'decision-foo')).toBe(true);
    expect(matchGlobPattern('decision-fo?', 'decision-for')).toBe(true);
    expect(matchGlobPattern('decision-fo?', 'decision-fooo')).toBe(false);
  });

  it('should escape regex special characters', () => {
    expect(matchGlobPattern('decision.foo', 'decision.foo')).toBe(true);
    expect(matchGlobPattern('decision.foo', 'decisionXfoo')).toBe(false);
    expect(matchGlobPattern('decision[1]', 'decision[1]')).toBe(true);
  });

  it('should handle LRU cache eviction when cache exceeds limit', () => {
    // MAX_CACHE_SIZE is 100, so calling with 101 unique patterns triggers eviction
    for (let i = 0; i < 101; i++) {
      expect(matchGlobPattern(`pattern-${i}-*`, `pattern-${i}-test`)).toBe(true);
    }
    // First pattern should have been evicted but still work (re-cached)
    expect(matchGlobPattern('pattern-0-*', 'pattern-0-test')).toBe(true);
  });
});

describe('matchTags', () => {
  it('should return true when all filter tags are present', () => {
    expect(matchTags(['a', 'b', 'c'], ['a', 'b'])).toBe(true);
    expect(matchTags(['a', 'b', 'c'], ['a'])).toBe(true);
    expect(matchTags(['a', 'b', 'c'], [])).toBe(true);
  });

  it('should return false when any filter tag is missing', () => {
    expect(matchTags(['a', 'b'], ['a', 'c'])).toBe(false);
    expect(matchTags(['a'], ['a', 'b'])).toBe(false);
    expect(matchTags([], ['a'])).toBe(false);
  });
});

describe('filterMemories', () => {
  const testMemories: IndexEntry[] = [
    {
      id: memoryId('decision-auth-flow'),
      type: MemoryType.Decision,
      title: 'Auth Flow Decision',
      tags: ['auth', 'security'],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      scope: Scope.Global,
      relativePath: 'permanent/decision-auth-flow.md',
    },
    {
      id: memoryId('decision-api-design'),
      type: MemoryType.Decision,
      title: 'API Design Decision',
      tags: ['api', 'design'],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      scope: Scope.Global,
      relativePath: 'permanent/decision-api-design.md',
    },
    {
      id: memoryId('learning-test-patterns'),
      type: MemoryType.Learning,
      title: 'Test Patterns',
      tags: ['testing', 'patterns'],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      scope: Scope.Project,
      relativePath: 'permanent/learning-test-patterns.md',
    },
    {
      id: memoryId('gotcha-auth-edge-case'),
      type: MemoryType.Gotcha,
      title: 'Auth Edge Case',
      tags: ['auth', 'gotcha'],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      scope: Scope.Global,
      relativePath: 'permanent/gotcha-auth-edge-case.md',
    },
  ];

  it('should filter by pattern', () => {
    const result = filterMemories(testMemories, { pattern: 'decision-*' });
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toEqual(['decision-auth-flow', 'decision-api-design']);
  });

  it('should filter by tags (AND logic)', () => {
    const result = filterMemories(testMemories, { tags: ['auth'] });
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toContain('decision-auth-flow');
    expect(result.map(m => m.id)).toContain('gotcha-auth-edge-case');
  });

  it('should filter by multiple tags (AND logic)', () => {
    const result = filterMemories(testMemories, { tags: ['auth', 'security'] });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('decision-auth-flow');
  });

  it('should filter by type', () => {
    const result = filterMemories(testMemories, { type: MemoryType.Decision });
    expect(result).toHaveLength(2);
    expect(result.every(m => m.type === MemoryType.Decision)).toBe(true);
  });

  it('should filter by scope', () => {
    const result = filterMemories(testMemories, { scope: Scope.Project });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('learning-test-patterns');
  });

  it('should combine multiple filters (AND logic)', () => {
    const result = filterMemories(testMemories, {
      pattern: '*-auth-*',
      type: MemoryType.Decision,
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('decision-auth-flow');
  });

  it('should return all when no criteria specified', () => {
    const result = filterMemories(testMemories, {});
    expect(result).toHaveLength(4);
  });

  it('should return empty array when no matches', () => {
    const result = filterMemories(testMemories, { pattern: 'nonexistent-*' });
    expect(result).toHaveLength(0);
  });
});

describe('countMatches', () => {
  const testMemories: IndexEntry[] = [
    {
      id: memoryId('decision-a'),
      type: MemoryType.Decision,
      title: 'A',
      tags: [],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      scope: Scope.Global,
      relativePath: 'permanent/decision-a.md',
    },
    {
      id: memoryId('decision-b'),
      type: MemoryType.Decision,
      title: 'B',
      tags: [],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      scope: Scope.Global,
      relativePath: 'permanent/decision-b.md',
    },
    {
      id: memoryId('learning-c'),
      type: MemoryType.Learning,
      title: 'C',
      tags: [],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      scope: Scope.Global,
      relativePath: 'permanent/learning-c.md',
    },
  ];

  it('should count matching memories', () => {
    expect(countMatches(testMemories, { pattern: 'decision-*' })).toBe(2);
    expect(countMatches(testMemories, { type: MemoryType.Learning })).toBe(1);
    expect(countMatches(testMemories, {})).toBe(3);
  });
});
