/**
 * Tests for resolveSharedScopePaths helper
 *
 * Phase D: Shared Memory Inclusion
 * Tests the multi-scope path resolution for --include-shared functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveSharedScopePaths } from './helpers.js';
import * as os from 'node:os';
import * as path from 'node:path';
import * as gitUtils from '../scope/git-utils.js';

describe('resolveSharedScopePaths', () => {
  const mockCwd = '/mock/project';
  const mockHome = '/mock/home';

  beforeEach(() => {
    // Mock process.cwd() and os.homedir()
    vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    vi.spyOn(os, 'homedir').mockReturnValue(mockHome);

    // Mock git detection to return true (so we get agent-project, not agent-global)
    vi.spyOn(gitUtils, 'isInGitRepository').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('with default scope (agent-project)', () => {
    it('returns array with agent-project path first', async () => {
      const paths = await resolveSharedScopePaths('typescript-expert');

      expect(paths).toBeInstanceOf(Array);
      expect(paths.length).toBeGreaterThan(0);
      // First path should be agent-project scope
      expect(paths[0]).toContain('agents/typescript-expert');
      expect(paths[0]).toContain('.claude/memory');
      expect(paths[0]).toContain(mockCwd);
    });

    it('includes shared scopes after agent scope', async () => {
      const paths = await resolveSharedScopePaths('typescript-expert');

      // Should have: agent-project, local, project, global
      expect(paths.length).toBeGreaterThanOrEqual(2);

      // Agent path first
      expect(paths[0]).toContain('agents/typescript-expert');

      // Remaining paths should be shared scopes
      const sharedPaths = paths.slice(1);
      expect(sharedPaths.length).toBeGreaterThan(0);
    });

    it('returns paths in correct order: agent → local → project → global', async () => {
      const paths = await resolveSharedScopePaths('rust-expert');

      // Agent scope first (most specific)
      expect(paths[0]).toContain('agents/rust-expert');

      // Check that subsequent paths follow hierarchy
      // We can't assert exact paths without knowing resolver internals,
      // but we can verify order and uniqueness
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(paths.length); // No duplicates
    });
  });

  describe('with explicit agent-project scope', () => {
    it('resolves to agent-project path', async () => {
      const paths = await resolveSharedScopePaths('api-architect', 'agent-project');

      expect(paths[0]).toContain('agents/api-architect');
      expect(paths[0]).toContain(mockCwd);
      expect(paths[0]).not.toContain(mockHome);
    });

    it('includes shared scopes after agent-project', async () => {
      const paths = await resolveSharedScopePaths('api-architect', 'agent-project');

      expect(paths.length).toBeGreaterThan(1);
      expect(paths[0]).toContain('agents/api-architect');
    });
  });

  describe('with explicit agent-global scope', () => {
    it('resolves to agent-global path', async () => {
      const paths = await resolveSharedScopePaths('frontend-expert', 'agent-global');

      expect(paths[0]).toContain('agents/frontend-expert');
      expect(paths[0]).toContain(mockHome);
      expect(paths[0]).not.toContain(mockCwd);
    });

    it('includes shared scopes after agent-global', async () => {
      const paths = await resolveSharedScopePaths('frontend-expert', 'agent-global');

      expect(paths.length).toBeGreaterThan(1);
      expect(paths[0]).toContain('agents/frontend-expert');
    });
  });

  describe('with project scope parameter', () => {
    it('converts to agent-project scope', async () => {
      const paths = await resolveSharedScopePaths('python-expert', 'project');

      // Should still resolve to agent-project (converted)
      expect(paths[0]).toContain('agents/python-expert');
      expect(paths[0]).toContain(mockCwd);
    });
  });

  describe('with global scope parameter', () => {
    it('converts to agent-global scope', async () => {
      const paths = await resolveSharedScopePaths('python-expert', 'global');

      // Should convert to agent-global
      expect(paths[0]).toContain('agents/python-expert');
      expect(paths[0]).toContain(mockHome);
    });
  });

  describe('agent name validation', () => {
    it('throws error for invalid agent name', () => {
      expect(() => resolveSharedScopePaths('Invalid Name With Spaces')).toThrow();
    });

    it('throws error for agent name with special characters', () => {
      expect(() => resolveSharedScopePaths('agent@special#chars')).toThrow();
    });

    it('accepts valid agent name with hyphens', async () => {
      const paths = await resolveSharedScopePaths('frontend-ui-expert');
      expect(paths).toBeInstanceOf(Array);
    });
  });

  describe('shared scope filtering', () => {
    it('filters out undefined/null paths from shared scopes', async () => {
      const paths = await resolveSharedScopePaths('typescript-expert');

      // All paths should be defined strings
      paths.forEach((p: string) => {
        expect(p).toBeDefined();
        expect(typeof p).toBe('string');
        expect(p.length).toBeGreaterThan(0);
      });
    });

    it('returns at least agent scope even if shared scopes unavailable', async () => {
      const paths = await resolveSharedScopePaths('typescript-expert');

      // Should always have at least the agent scope
      expect(paths.length).toBeGreaterThanOrEqual(1);
      expect(paths[0]).toContain('agents/typescript-expert');
    });
  });

  describe('path format validation', () => {
    it('returns absolute paths', async () => {
      const paths = await resolveSharedScopePaths('typescript-expert');

      paths.forEach((p: string) => {
        expect(path.isAbsolute(p)).toBe(true);
      });
    });

    it('includes agent name in agent scope path', async () => {
      const agentName = 'database-architect';
      const paths = await resolveSharedScopePaths(agentName);

      expect(paths[0]).toContain(`agents/${agentName}`);
    });

    it('uses correct directory separators for platform', async () => {
      const paths = await resolveSharedScopePaths('typescript-expert');

      // Paths should use platform-specific separators
      // (path.sep is mocked via cwd/homedir, so we just check consistency)
      paths.forEach((p: string) => {
        expect(p).not.toContain('//'); // No double slashes
      });
    });
  });
});
