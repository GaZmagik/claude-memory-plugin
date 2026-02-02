import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mock } from 'bun:test';
import { Scope } from '../../../skills/memory/src/types/enums.js';

// Mock the git utility module before importing resolver
mock.module('../../../skills/memory/src/scope/git-utils.js', () => ({
  isInGitRepository: mock(() => true),
  findGitRoot: mock((cwd: string) => cwd),
}));

describe('getDefaultScope with agent context in git repository', () => {
  beforeEach(async () => {
    // Reset mocks
    const gitUtils = await import('../../../skills/memory/src/scope/git-utils.js');
    mock(() => true).mockReturnValue(true);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Agent context provided', () => {
    it('should return AgentProject when in git repository', async () => {
      const { getDefaultScope } = await import('../../../skills/memory/src/scope/resolver.js');

      const result = getDefaultScope({
        cwd: '/home/user/my-project',
        globalMemoryPath: '/home/user/.claude/memory',
        agentName: 'typescript-expert',
      });

      expect(result).toBe(Scope.AgentProject);
    });

    it('should return AgentProject for different agent names', async () => {
      const { getDefaultScope } = await import('../../../skills/memory/src/scope/resolver.js');

      expect(
        getDefaultScope({
          cwd: '/home/user/my-project',
          globalMemoryPath: '/home/user/.claude/memory',
          agentName: 'rust-systems',
        })
      ).toBe(Scope.AgentProject);

      expect(
        getDefaultScope({
          cwd: '/home/user/my-project',
          globalMemoryPath: '/home/user/.claude/memory',
          agentName: 'api-architect',
        })
      ).toBe(Scope.AgentProject);
    });
  });

  describe('No agent context', () => {
    it('should return Project when no agent specified in git repository', async () => {
      const { getDefaultScope } = await import('../../../skills/memory/src/scope/resolver.js');

      const result = getDefaultScope({
        cwd: '/home/user/my-project',
        globalMemoryPath: '/home/user/.claude/memory',
      });

      expect(result).toBe(Scope.Project);
    });

    it('should return Project when agentName is empty string', async () => {
      const { getDefaultScope } = await import('../../../skills/memory/src/scope/resolver.js');

      const result = getDefaultScope({
        cwd: '/home/user/my-project',
        globalMemoryPath: '/home/user/.claude/memory',
        agentName: '',
      });

      expect(result).toBe(Scope.Project);
    });

    it('should return Project when agentName is undefined', async () => {
      const { getDefaultScope } = await import('../../../skills/memory/src/scope/resolver.js');

      const result = getDefaultScope({
        cwd: '/home/user/my-project',
        globalMemoryPath: '/home/user/.claude/memory',
        agentName: undefined,
      });

      expect(result).toBe(Scope.Project);
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain existing behaviour for non-agent operations', async () => {
      const { getDefaultScope } = await import('../../../skills/memory/src/scope/resolver.js');

      // Existing code without agentName should still work
      const result = getDefaultScope({
        cwd: '/home/user/my-project',
        globalMemoryPath: '/home/user/.claude/memory',
      });

      expect(result).toBe(Scope.Project);
    });
  });
});
