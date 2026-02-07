/**
 * Tests for get-agent-directory-path utility
 */

import { describe, it, expect } from 'vitest';
import { getAgentDirectoryPath } from './get-agent-directory-path.js';
import { Scope } from '../types/enums.js';

describe('getAgentDirectoryPath', () => {
  describe('AgentProject scope', () => {
    it('resolves path correctly with projectRoot', () => {
      const result = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'typescript-expert',
        projectRoot: '/home/user/project',
      });
      expect(result).toBe('/home/user/project/.claude/memory/agents/typescript-expert');
    });

    it('sanitises agent name in path', () => {
      const result = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'TypeScript Expert',
        projectRoot: '/home/user/project',
      });
      expect(result).toBe('/home/user/project/.claude/memory/agents/typescript-expert');
    });

    it('throws when projectRoot is missing', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.AgentProject,
          agentName: 'typescript-expert',
        })
      ).toThrow('projectRoot is required');
    });
  });

  describe('AgentGlobal scope', () => {
    it('resolves path correctly with globalRoot', () => {
      const result = getAgentDirectoryPath({
        scope: Scope.AgentGlobal,
        agentName: 'typescript-expert',
        globalRoot: '/home/user/.claude/memory',
      });
      expect(result).toBe('/home/user/.claude/memory/agents/typescript-expert');
    });

    it('sanitises agent name in path', () => {
      const result = getAgentDirectoryPath({
        scope: Scope.AgentGlobal,
        agentName: 'TypeScript Expert',
        globalRoot: '/home/user/.claude/memory',
      });
      expect(result).toBe('/home/user/.claude/memory/agents/typescript-expert');
    });

    it('throws when globalRoot is missing', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.AgentGlobal,
          agentName: 'typescript-expert',
        })
      ).toThrow('globalRoot is required');
    });
  });

  describe('non-agent scopes', () => {
    it('throws for Scope.Project', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.Project,
          agentName: 'typescript-expert',
          projectRoot: '/home/user/project',
        })
      ).toThrow('not an agent scope');
    });

    it('throws for Scope.Global', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.Global,
          agentName: 'typescript-expert',
          globalRoot: '/home/user/.claude/memory',
        })
      ).toThrow('not an agent scope');
    });

    it('throws for Scope.Local', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.Local,
          agentName: 'typescript-expert',
          projectRoot: '/home/user/project',
        })
      ).toThrow('not an agent scope');
    });

    it('throws for Scope.Enterprise', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.Enterprise,
          agentName: 'typescript-expert',
        })
      ).toThrow('not an agent scope');
    });
  });

  describe('agent name validation', () => {
    it('throws for empty agent name', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.AgentProject,
          agentName: '',
          projectRoot: '/home/user/project',
        })
      ).toThrow('agentName is required');
    });

    it('throws for whitespace-only agent name', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.AgentProject,
          agentName: '   ',
          projectRoot: '/home/user/project',
        })
      ).toThrow('agentName is required');
    });

    it('throws for agent name with no valid characters after sanitisation', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.AgentProject,
          agentName: '!@#$%',
          projectRoot: '/home/user/project',
        })
      ).toThrow('no valid characters');
    });
  });

  describe('examples from docstring', () => {
    it('handles agent-project example', () => {
      const result = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'typescript-expert',
        projectRoot: '/home/user/project',
      });
      expect(result).toBe('/home/user/project/.claude/memory/agents/typescript-expert');
    });

    it('handles agent-global example', () => {
      const result = getAgentDirectoryPath({
        scope: Scope.AgentGlobal,
        agentName: 'typescript-expert',
        globalRoot: '/home/user/.claude/memory',
      });
      expect(result).toBe('/home/user/.claude/memory/agents/typescript-expert');
    });
  });
});
