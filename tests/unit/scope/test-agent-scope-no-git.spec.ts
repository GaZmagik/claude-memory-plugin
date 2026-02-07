import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mock } from 'bun:test';
import { Scope } from '../../../skills/memory/src/types/enums.js';

// Mock the git utility module before importing resolver
mock.module('../../../skills/memory/src/scope/git-utils.js', () => ({
  isInGitRepository: mock(() => false),
  findGitRoot: mock((cwd: string) => cwd),
}));

describe('getDefaultScope with agent context outside git repository', () => {
  beforeEach(() => {
    // Mocks are already set up via mock.module
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Agent context provided', () => {
    it('should return AgentGlobal when not in git repository', async () => {
      const { getDefaultScope } = await import('../../../skills/memory/src/scope/resolver.js');

      const result = getDefaultScope({
        cwd: '/home/user/temp-dir',
        globalMemoryPath: '/home/user/.claude/memory',
        agentName: 'typescript-expert',
      });

      expect(result).toBe(Scope.AgentGlobal);
    });

    it('should return AgentGlobal for different agent names', async () => {
      const { getDefaultScope } = await import('../../../skills/memory/src/scope/resolver.js');

      expect(
        getDefaultScope({
          cwd: '/home/user/temp-dir',
          globalMemoryPath: '/home/user/.claude/memory',
          agentName: 'rust-systems',
        })
      ).toBe(Scope.AgentGlobal);

      expect(
        getDefaultScope({
          cwd: '/home/user/temp-dir',
          globalMemoryPath: '/home/user/.claude/memory',
          agentName: 'api-architect',
        })
      ).toBe(Scope.AgentGlobal);
    });
  });

  describe('No agent context', () => {
    it('should return Global when no agent specified outside git repository', async () => {
      const { getDefaultScope } = await import('../../../skills/memory/src/scope/resolver.js');

      const result = getDefaultScope({
        cwd: '/home/user/temp-dir',
        globalMemoryPath: '/home/user/.claude/memory',
      });

      expect(result).toBe(Scope.Global);
    });

    it('should return Global when agentName is empty string', async () => {
      const { getDefaultScope } = await import('../../../skills/memory/src/scope/resolver.js');

      const result = getDefaultScope({
        cwd: '/home/user/temp-dir',
        globalMemoryPath: '/home/user/.claude/memory',
        agentName: '',
      });

      expect(result).toBe(Scope.Global);
    });
  });

  describe('Mirrors project/global pattern', () => {
    it('should parallel existing default scope behaviour', async () => {
      const { getDefaultScope } = await import('../../../skills/memory/src/scope/resolver.js');

      // Without agent: global
      const withoutAgent = getDefaultScope({
        cwd: '/home/user/temp-dir',
        globalMemoryPath: '/home/user/.claude/memory',
      });

      // With agent: agent-global
      const withAgent = getDefaultScope({
        cwd: '/home/user/temp-dir',
        globalMemoryPath: '/home/user/.claude/memory',
        agentName: 'typescript-expert',
      });

      expect(withoutAgent).toBe(Scope.Global);
      expect(withAgent).toBe(Scope.AgentGlobal);
    });
  });
});
