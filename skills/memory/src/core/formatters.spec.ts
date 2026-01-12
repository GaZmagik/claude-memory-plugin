/**
 * Tests for T056: Output formatting with scope indicators
 */

import { describe, it, expect } from 'vitest';
import {
  getScopeIndicator,
  formatMemorySummary,
  formatSearchResult,
  formatMemoryList,
  formatSearchResults,
  getScopeDescription,
  formatScopeHierarchy,
} from './formatters.js';
import { Scope, MemoryType } from '../types/enums.js';
import type { MemorySummary, SearchResult } from '../types/api.js';

describe('getScopeIndicator', () => {
  it('should return bracketed scope indicator by default', () => {
    expect(getScopeIndicator(Scope.Project)).toBe('[project]');
    expect(getScopeIndicator(Scope.Local)).toBe('[local]');
    expect(getScopeIndicator(Scope.Global)).toBe('[global]');
    expect(getScopeIndicator(Scope.Enterprise)).toBe('[enterprise]');
  });

  it('should return short form when requested', () => {
    expect(getScopeIndicator(Scope.Project, { short: true })).toBe('[P]');
    expect(getScopeIndicator(Scope.Local, { short: true })).toBe('[L]');
    expect(getScopeIndicator(Scope.Global, { short: true })).toBe('[G]');
    expect(getScopeIndicator(Scope.Enterprise, { short: true })).toBe('[E]');
  });

  it('should return without brackets when requested', () => {
    expect(getScopeIndicator(Scope.Project, { brackets: false })).toBe('project');
    expect(getScopeIndicator(Scope.Local, { brackets: false, short: true })).toBe('L');
  });
});

describe('formatMemorySummary', () => {
  const mockMemory: MemorySummary = {
    id: 'test-memory',
    type: MemoryType.Learning,
    title: 'Test Learning',
    tags: ['typescript', 'testing'],
    scope: Scope.Project,
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
    relativePath: 'test-memory.md',
  };

  it('should format memory with tags', () => {
    const result = formatMemorySummary(mockMemory);
    expect(result).toContain('[project]');
    expect(result).toContain('learning/test-memory');
    expect(result).toContain('Test Learning');
    expect(result).toContain('typescript, testing');
  });

  it('should format memory without tags', () => {
    const memoryWithoutTags: MemorySummary = { ...mockMemory, tags: [] };
    const result = formatMemorySummary(memoryWithoutTags);
    expect(result).not.toContain('()');
  });

  it('should respect scope indicator options', () => {
    const result = formatMemorySummary(mockMemory, { short: true });
    expect(result).toContain('[P]');
  });
});

describe('formatSearchResult', () => {
  const mockResult: SearchResult = {
    id: 'test-result',
    type: MemoryType.Decision,
    title: 'Test Decision',
    tags: ['architecture'],
    scope: Scope.Global,
    score: 0.85,
    snippet: 'This is a test snippet...',
  };

  it('should format search result with score', () => {
    const result = formatSearchResult(mockResult);
    expect(result).toContain('[global]');
    expect(result).toContain('decision/test-result');
    expect(result).toContain('Test Decision');
    expect(result).toContain('(85%)');
  });

  it('should include snippet when provided', () => {
    const result = formatSearchResult(mockResult);
    expect(result).toContain('This is a test snippet...');
  });

  it('should handle missing snippet', () => {
    const resultWithoutSnippet: SearchResult = { ...mockResult, snippet: undefined };
    const result = formatSearchResult(resultWithoutSnippet);
    expect(result).not.toContain('This is a test snippet...');
  });

  it('should handle missing scope', () => {
    const resultWithoutScope: SearchResult = { ...mockResult, scope: undefined };
    const result = formatSearchResult(resultWithoutScope);
    expect(result).not.toContain('[global]');
  });
});

describe('formatMemoryList', () => {
  it('should return empty message for empty list', () => {
    const result = formatMemoryList([]);
    expect(result).toBe('No memories found.');
  });

  it('should format multiple memories', () => {
    const memories: MemorySummary[] = [
      {
        id: 'mem-1',
        type: MemoryType.Learning,
        title: 'First',
        tags: [],
        scope: Scope.Project,
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
        relativePath: 'mem-1.md',
      },
      {
        id: 'mem-2',
        type: MemoryType.Decision,
        title: 'Second',
        tags: [],
        scope: Scope.Global,
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
        relativePath: 'mem-2.md',
      },
    ];
    const result = formatMemoryList(memories);
    expect(result).toContain('mem-1');
    expect(result).toContain('mem-2');
  });
});

describe('formatSearchResults', () => {
  it('should return empty message for empty results', () => {
    const result = formatSearchResults([]);
    expect(result).toBe('No results found.');
  });

  it('should format multiple results with double newlines', () => {
    const results: SearchResult[] = [
      {
        id: 'res-1',
        type: MemoryType.Learning,
        title: 'First',
        tags: [],
        scope: Scope.Project,
        score: 0.9,
      },
      {
        id: 'res-2',
        type: MemoryType.Decision,
        title: 'Second',
        tags: [],
        scope: Scope.Global,
        score: 0.7,
      },
    ];
    const result = formatSearchResults(results);
    expect(result).toContain('\n\n');
  });
});

describe('getScopeDescription', () => {
  it('should return description for enterprise scope', () => {
    const result = getScopeDescription(Scope.Enterprise);
    expect(result).toContain('Organisation-wide');
  });

  it('should return description for local scope', () => {
    const result = getScopeDescription(Scope.Local);
    expect(result).toContain('Personal project');
    expect(result).toContain('gitignored');
  });

  it('should return description for project scope', () => {
    const result = getScopeDescription(Scope.Project);
    expect(result).toContain('Shared project');
    expect(result).toContain('git');
  });

  it('should return description for global scope', () => {
    const result = getScopeDescription(Scope.Global);
    expect(result).toContain('cross-project');
    expect(result).toContain('~/.claude/memory/');
  });
});

describe('formatScopeHierarchy', () => {
  it('should format scope hierarchy with precedence order', () => {
    const result = formatScopeHierarchy();
    expect(result).toContain('Scope hierarchy');
    expect(result).toContain('[enterprise]');
    expect(result).toContain('[local]');
    expect(result).toContain('[project]');
    expect(result).toContain('[global]');
  });

  it('should show enterprise first (highest precedence)', () => {
    const result = formatScopeHierarchy();
    const lines = result.split('\n');
    expect(lines[1]).toContain('enterprise');
  });
});
