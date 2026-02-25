/**
 * Tests for scope indicator utilities
 *
 * Phase D: Shared Memory Inclusion
 * Tests getScopeNameFromPath() and formatScopedResult() utilities
 * for adding scope indicators to multi-scope search results.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getScopeNameFromPath, formatScopedResult } from './scope-indicators.js';
import * as path from 'node:path';

const { mockHomedir } = vi.hoisted(() => ({
  mockHomedir: vi.fn(),
}));

vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:os')>()),
  homedir: mockHomedir,
}));

describe('getScopeNameFromPath', () => {
  const mockHome = '/home/testuser';
  const mockCwd = '/var/projects/myproject'; // Not under home dir

  beforeEach(() => {
    // Mock os.homedir() to return consistent home directory
    mockHomedir.mockReturnValue(mockHome);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('agent scope detection', () => {
    it('identifies agent-project scope from project path', () => {
      const agentPath = path.join(mockCwd, '.claude/memory/agents/typescript-expert');
      const scopeName = getScopeNameFromPath(agentPath);

      expect(scopeName).toBe('agent-project');
    });

    it('identifies agent-global scope from global path', () => {
      const agentPath = path.join(mockHome, '.claude/memory/agents/rust-expert');
      const scopeName = getScopeNameFromPath(agentPath);

      expect(scopeName).toBe('agent-global');
    });

    it('extracts agent name for agent-project scope', () => {
      const agentPath = '/project/.claude/memory/agents/frontend-ui-expert';
      const scopeName = getScopeNameFromPath(agentPath);

      // Should identify as agent scope (specific format tested separately)
      expect(scopeName).toContain('agent');
    });

    it('handles agent paths with trailing slashes', () => {
      const agentPath = path.join(mockCwd, '.claude/memory/agents/api-architect/');
      const scopeName = getScopeNameFromPath(agentPath);

      expect(scopeName).toBe('agent-project');
    });

    it('handles deeply nested agent paths', () => {
      const agentPath = path.join(mockCwd, '.claude/memory/agents/typescript-expert/permanent');
      const scopeName = getScopeNameFromPath(agentPath);

      expect(scopeName).toBe('agent-project');
    });
  });

  describe('local scope detection', () => {
    it('identifies local scope from .claude/memory/local path', () => {
      const localPath = path.join(mockCwd, '.claude/memory/local');
      const scopeName = getScopeNameFromPath(localPath);

      expect(scopeName).toBe('local');
    });

    it('identifies local scope with nested paths', () => {
      const localPath = path.join(mockCwd, '.claude/memory/local/permanent');
      const scopeName = getScopeNameFromPath(localPath);

      expect(scopeName).toBe('local');
    });
  });

  describe('project scope detection', () => {
    it('identifies project scope from project .claude/memory path', () => {
      const projectPath = path.join(mockCwd, '.claude/memory');
      const scopeName = getScopeNameFromPath(projectPath);

      expect(scopeName).toBe('project');
    });

    it('identifies project scope with permanent subdirectory', () => {
      const projectPath = path.join(mockCwd, '.claude/memory/permanent');
      const scopeName = getScopeNameFromPath(projectPath);

      expect(scopeName).toBe('project');
    });

    it('distinguishes project from global by path location', () => {
      const projectPath = '/some/project/.claude/memory';
      const scopeName = getScopeNameFromPath(projectPath);

      // Should be project, not global (doesn't contain home dir)
      expect(scopeName).toBe('project');
    });
  });

  describe('global scope detection', () => {
    it('identifies global scope from home directory path', () => {
      const globalPath = path.join(mockHome, '.claude/memory');
      const scopeName = getScopeNameFromPath(globalPath);

      expect(scopeName).toBe('global');
    });

    it('identifies global scope with subdirectories', () => {
      const globalPath = path.join(mockHome, '.claude/memory/permanent');
      const scopeName = getScopeNameFromPath(globalPath);

      expect(scopeName).toBe('global');
    });

    it('uses actual home directory for detection', () => {
      const actualHome = mockHome; // uses the mocked value
      const globalPath = path.join(actualHome, '.claude/memory');
      const scopeName = getScopeNameFromPath(globalPath);

      expect(scopeName).toBe('global');
    });
  });

  describe('priority and disambiguation', () => {
    it('prioritizes agent detection over other scopes', () => {
      // Path could be interpreted as local OR agent
      const agentLocalPath = path.join(mockCwd, '.claude/memory/agents/expert/local');
      const scopeName = getScopeNameFromPath(agentLocalPath);

      // Should detect as agent scope, not local
      expect(scopeName).toContain('agent');
    });

    it('prioritizes local over project when path contains /local/', () => {
      const localPath = path.join(mockCwd, '.claude/memory/local');
      const scopeName = getScopeNameFromPath(localPath);

      expect(scopeName).toBe('local');
    });
  });

  describe('unknown paths', () => {
    it('returns "unknown" for unrecognized path patterns', () => {
      const weirdPath = '/completely/unrelated/path';
      const scopeName = getScopeNameFromPath(weirdPath);

      expect(scopeName).toBe('unknown');
    });

    it('returns "unknown" for empty path', () => {
      const scopeName = getScopeNameFromPath('');

      expect(scopeName).toBe('unknown');
    });

    it('handles malformed paths gracefully', () => {
      const badPath = '////invalid///path//';
      const scopeName = getScopeNameFromPath(badPath);

      expect(scopeName).toBe('unknown');
    });
  });
});

describe('formatScopedResult', () => {
  describe('basic formatting', () => {
    it('formats result with scope indicator prefix', () => {
      const formatted = formatScopedResult('learning-typescript-patterns', 'agent-project');

      expect(formatted).toBe('[agent-project] learning-typescript-patterns');
    });

    it('formats with different scope names', () => {
      const projectResult = formatScopedResult('decision-api-design', 'project');
      const globalResult = formatScopedResult('artifact-standards', 'global');

      expect(projectResult).toBe('[project] decision-api-design');
      expect(globalResult).toBe('[global] artifact-standards');
    });

    it('formats agent-global scope correctly', () => {
      const formatted = formatScopedResult('gotcha-memory-issue', 'agent-global');

      expect(formatted).toBe('[agent-global] gotcha-memory-issue');
    });

    it('formats local scope correctly', () => {
      const formatted = formatScopedResult('breadcrumb-experiment', 'local');

      expect(formatted).toBe('[local] breadcrumb-experiment');
    });
  });

  describe('memory ID edge cases', () => {
    it('handles memory IDs with hyphens', () => {
      const formatted = formatScopedResult('learning-multi-agent-systems', 'project');

      expect(formatted).toBe('[project] learning-multi-agent-systems');
    });

    it('handles memory IDs with underscores', () => {
      const formatted = formatScopedResult('decision_auth_strategy', 'global');

      expect(formatted).toBe('[global] decision_auth_strategy');
    });

    it('handles short memory IDs', () => {
      const formatted = formatScopedResult('abc', 'project');

      expect(formatted).toBe('[project] abc');
    });

    it('handles long memory IDs', () => {
      const longId = 'learning-' + 'a'.repeat(100);
      const formatted = formatScopedResult(longId, 'agent-project');

      expect(formatted).toContain('[agent-project]');
      expect(formatted).toContain(longId);
    });
  });

  describe('scope name edge cases', () => {
    it('handles unknown scope name', () => {
      const formatted = formatScopedResult('memory-id', 'unknown');

      expect(formatted).toBe('[unknown] memory-id');
    });

    it('preserves scope name exactly as provided', () => {
      const formatted = formatScopedResult('memory-id', 'Custom-Scope');

      expect(formatted).toBe('[Custom-Scope] memory-id');
    });
  });

  describe('output format consistency', () => {
    it('always includes space after closing bracket', () => {
      const formatted = formatScopedResult('test-id', 'project');

      expect(formatted).toMatch(/\] /);
    });

    it('always starts with opening bracket', () => {
      const formatted = formatScopedResult('test-id', 'project');

      expect(formatted).toMatch(/^\[/);
    });

    it('produces parseable output format', () => {
      const formatted = formatScopedResult('test-memory', 'agent-project');

      // Should be able to extract scope and ID
      const match = formatted.match(/^\[([^\]]+)\] (.+)$/);
      expect(match).toBeTruthy();
      expect(match![1]).toBe('agent-project');
      expect(match![2]).toBe('test-memory');
    });
  });
});
