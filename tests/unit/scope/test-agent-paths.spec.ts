import { describe, it, expect } from 'vitest';
import { getAgentDirectoryPath } from '../../../skills/memory/src/scope/get-agent-directory-path.js';
import { Scope } from '../../../skills/memory/src/types/enums.js';
import path from 'path';

describe('getAgentDirectoryPath', () => {
  describe('Agent-project scope', () => {
    it('should return path under project .claude/memory/agents/{name}/', () => {
      const projectRoot = '/home/user/my-project';
      const agentName = 'typescript-expert';

      const result = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName,
        projectRoot,
      });

      expect(result).toBe(
        path.join(projectRoot, '.claude/memory/agents', agentName)
      );
    });

    it('should handle different agent names', () => {
      const projectRoot = '/home/user/my-project';

      expect(
        getAgentDirectoryPath({
          scope: Scope.AgentProject,
          agentName: 'rust-systems',
          projectRoot,
        })
      ).toBe(path.join(projectRoot, '.claude/memory/agents/rust-systems'));

      expect(
        getAgentDirectoryPath({
          scope: Scope.AgentProject,
          agentName: 'api-architect',
          projectRoot,
        })
      ).toBe(path.join(projectRoot, '.claude/memory/agents/api-architect'));
    });

    it('should normalize path separators', () => {
      const projectRoot = '/home/user/my-project';
      const agentName = 'typescript-expert';

      const result = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName,
        projectRoot,
      });

      // Should use path.join which handles OS-specific separators
      expect(result).toContain('agents');
      expect(result).toContain(agentName);
    });
  });

  describe('Agent-global scope', () => {
    it('should return path under global ~/.claude/memory/agents/{name}/', () => {
      const globalRoot = '/home/user/.claude/memory';
      const agentName = 'typescript-expert';

      const result = getAgentDirectoryPath({
        scope: Scope.AgentGlobal,
        agentName,
        globalRoot,
      });

      expect(result).toBe(path.join(globalRoot, 'agents', agentName));
    });

    it('should handle different agent names', () => {
      const globalRoot = '/home/user/.claude/memory';

      expect(
        getAgentDirectoryPath({
          scope: Scope.AgentGlobal,
          agentName: 'rust-systems',
          globalRoot,
        })
      ).toBe(path.join(globalRoot, 'agents/rust-systems'));

      expect(
        getAgentDirectoryPath({
          scope: Scope.AgentGlobal,
          agentName: 'api-architect',
          globalRoot,
        })
      ).toBe(path.join(globalRoot, 'agents/api-architect'));
    });
  });

  describe('Non-agent scopes', () => {
    it('should throw error for Project scope', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.Project,
          agentName: 'typescript-expert',
          projectRoot: '/home/user/project',
        })
      ).toThrow('not an agent scope');
    });

    it('should throw error for Global scope', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.Global,
          agentName: 'typescript-expert',
          globalRoot: '/home/user/.claude/memory',
        })
      ).toThrow('not an agent scope');
    });

    it('should throw error for Local scope', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.Local,
          agentName: 'typescript-expert',
          projectRoot: '/home/user/project',
        })
      ).toThrow('not an agent scope');
    });
  });

  describe('Missing parameters', () => {
    it('should throw error when agentName is missing', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.AgentProject,
          agentName: '',
          projectRoot: '/home/user/project',
        })
      ).toThrow('agentName is required');
    });

    it('should throw error when projectRoot is missing for AgentProject', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.AgentProject,
          agentName: 'typescript-expert',
          projectRoot: undefined as any,
        })
      ).toThrow('projectRoot is required');
    });

    it('should throw error when globalRoot is missing for AgentGlobal', () => {
      expect(() =>
        getAgentDirectoryPath({
          scope: Scope.AgentGlobal,
          agentName: 'typescript-expert',
          globalRoot: undefined as any,
        })
      ).toThrow('globalRoot is required');
    });
  });

  describe('Path structure validation', () => {
    it('should create correct nested structure for agent-project', () => {
      const result = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'typescript-expert',
        projectRoot: '/project',
      });

      const parts = result.split(path.sep);
      expect(parts).toContain('.claude');
      expect(parts).toContain('memory');
      expect(parts).toContain('agents');
      expect(parts).toContain('typescript-expert');
    });

    it('should create correct nested structure for agent-global', () => {
      const result = getAgentDirectoryPath({
        scope: Scope.AgentGlobal,
        agentName: 'typescript-expert',
        globalRoot: '/home/user/.claude/memory',
      });

      const parts = result.split(path.sep);
      expect(parts).toContain('agents');
      expect(parts).toContain('typescript-expert');
    });
  });
});
