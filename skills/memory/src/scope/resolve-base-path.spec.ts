/**
 * Tests for resolveBasePath utility
 *
 * Covers all four cases:
 *   - Regular scope with explicit basePath
 *   - Regular scope falling back to process.cwd()
 *   - Agent-project scope
 *   - Agent-global scope
 *   - Missing agent name for agent scopes (returns error)
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { mock } from 'bun:test';
import { resolveBasePath } from './resolve-base-path.js';
import { Scope } from '../types/enums.js';

// Mock function for vi.mock factory
// Note: vi.hoisted() is unavailable in Bun — top-level declarations are hoisted naturally
const mockGetAgentDirectoryPath = vi.fn();

vi.mock('./get-agent-directory-path.js', () => ({
  getAgentDirectoryPath: mockGetAgentDirectoryPath,
}));

describe('resolveBasePath', () => {
  const originalCwd = process.cwd;

  beforeEach(() => {
    vi.clearAllMocks();
    // Provide a stable cwd for tests that rely on the fallback
    process.cwd = () => '/fake/cwd';
  });

  afterEach(() => {
    process.cwd = originalCwd;
    vi.restoreAllMocks();
  });

  afterAll(() => {
    mock.restore(); // Unmock vi.mock module replacements to prevent cross-test pollution
  });

  // -------------------------------------------------------------------------
  // Regular scopes
  // -------------------------------------------------------------------------

  describe('regular scope — explicit basePath', () => {
    it('returns the supplied basePath when no scope is given', () => {
      const result = resolveBasePath({ basePath: '/custom/path' });

      expect(result).toEqual({ basePath: '/custom/path' });
    });

    it('returns the supplied basePath for Scope.Project', () => {
      const result = resolveBasePath({ scope: Scope.Project, basePath: '/project/memory' });

      expect(result).toEqual({ basePath: '/project/memory' });
    });

    it('returns the supplied basePath for Scope.Global', () => {
      const result = resolveBasePath({ scope: Scope.Global, basePath: '/home/user/.claude/memory' });

      expect(result).toEqual({ basePath: '/home/user/.claude/memory' });
    });

    it('returns the supplied basePath for Scope.Local', () => {
      const result = resolveBasePath({ scope: Scope.Local, basePath: '/project/memory' });

      expect(result).toEqual({ basePath: '/project/memory' });
    });
  });

  describe('regular scope — cwd fallback', () => {
    it('falls back to process.cwd() when basePath is not provided', () => {
      const result = resolveBasePath({});

      expect(result).toEqual({ basePath: '/fake/cwd' });
    });

    it('falls back to process.cwd() when scope is Project and basePath is absent', () => {
      const result = resolveBasePath({ scope: Scope.Project });

      expect(result).toEqual({ basePath: '/fake/cwd' });
    });
  });

  // -------------------------------------------------------------------------
  // Agent-project scope
  // -------------------------------------------------------------------------

  describe('AgentProject scope', () => {
    it('returns agent directory path for agent-project scope', () => {
      mockGetAgentDirectoryPath.mockReturnValue('/project/.claude/memory/agents/my-agent');

      const result = resolveBasePath({
        scope: Scope.AgentProject,
        agent: 'my-agent',
      });

      expect(result).toEqual({ basePath: '/project/.claude/memory/agents/my-agent' });
      expect(mockGetAgentDirectoryPath).toHaveBeenCalledWith({
        scope: Scope.AgentProject,
        agentName: 'my-agent',
        projectRoot: '/fake/cwd',
        globalRoot: undefined,
      });
    });

    it('returns error when agent is missing for AgentProject scope', () => {
      const result = resolveBasePath({ scope: Scope.AgentProject });

      expect(result).toEqual({ error: 'agent field is required for agent scopes' });
      expect(mockGetAgentDirectoryPath).not.toHaveBeenCalled();
    });

    it('returns error when agent is an empty string for AgentProject scope', () => {
      const result = resolveBasePath({ scope: Scope.AgentProject, agent: '' });

      expect(result).toEqual({ error: 'agent field is required for agent scopes' });
      expect(mockGetAgentDirectoryPath).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Agent-global scope
  // -------------------------------------------------------------------------

  describe('AgentGlobal scope', () => {
    it('returns agent directory path for agent-global scope with explicit basePath', () => {
      mockGetAgentDirectoryPath.mockReturnValue('/home/user/.claude/memory/agents/my-agent');

      const result = resolveBasePath({
        scope: Scope.AgentGlobal,
        agent: 'my-agent',
        basePath: '/home/user/.claude/memory',
      });

      expect(result).toEqual({ basePath: '/home/user/.claude/memory/agents/my-agent' });
      expect(mockGetAgentDirectoryPath).toHaveBeenCalledWith({
        scope: Scope.AgentGlobal,
        agentName: 'my-agent',
        projectRoot: undefined,
        globalRoot: '/home/user/.claude/memory',
      });
    });

    it('returns agent directory path for agent-global scope falling back to default global root', () => {
      mockGetAgentDirectoryPath.mockReturnValue('/home/user/.claude/memory/agents/my-agent');

      const result = resolveBasePath({
        scope: Scope.AgentGlobal,
        agent: 'my-agent',
      });

      expect(result).toEqual({ basePath: '/home/user/.claude/memory/agents/my-agent' });
      // globalRoot should be derived from os.homedir() when basePath is absent
      const call = mockGetAgentDirectoryPath.mock.calls[0][0] as Record<string, unknown>;
      expect(call.scope).toBe(Scope.AgentGlobal);
      expect(call.agentName).toBe('my-agent');
      expect(call.projectRoot).toBeUndefined();
      expect(typeof call.globalRoot).toBe('string');
      expect((call.globalRoot as string).endsWith('.claude/memory')).toBe(true);
    });

    it('returns error when agent is missing for AgentGlobal scope', () => {
      const result = resolveBasePath({ scope: Scope.AgentGlobal });

      expect(result).toEqual({ error: 'agent field is required for agent scopes' });
      expect(mockGetAgentDirectoryPath).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Error propagation from getAgentDirectoryPath
  // -------------------------------------------------------------------------

  describe('error propagation', () => {
    it('returns an error result when getAgentDirectoryPath throws', () => {
      mockGetAgentDirectoryPath.mockImplementation(() => {
        throw new Error('agentName contains no valid characters after sanitisation');
      });

      const result = resolveBasePath({
        scope: Scope.AgentProject,
        agent: '!@#$%',
      });

      expect(result).toEqual({
        error: 'agentName contains no valid characters after sanitisation',
      });
    });
  });
});
