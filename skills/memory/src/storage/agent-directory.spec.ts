/**
 * T027: Unit test for agent directory creation
 *
 * Tests createAgentDirectory and agentDirectoryExists utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAgentDirectory } from './create-agent-directory.js';
import { agentDirectoryExists } from './agent-directory-exists.js';
import { Scope } from '../types/enums.js';
import * as fsUtils from '../core/fs-utils.js';
import * as path from 'node:path';

describe('Agent directory utilities', () => {
  const mockProjectRoot = '/test/project';
  const mockGlobalRoot = '/test/global';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createAgentDirectory', () => {
    it('should create agent-project directory with subdirectories', async () => {
      vi.spyOn(fsUtils, 'ensureDir').mockResolvedValue(undefined);

      const result = await createAgentDirectory(
        Scope.AgentProject,
        'typescript-expert',
        mockProjectRoot
      );

      expect(result).toBe(
        path.join(mockProjectRoot, '.claude/memory/agents/typescript-expert')
      );
      expect(fsUtils.ensureDir).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.claude/memory/agents/typescript-expert')
      );
      expect(fsUtils.ensureDir).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.claude/memory/agents/typescript-expert/permanent')
      );
      expect(fsUtils.ensureDir).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.claude/memory/agents/typescript-expert/temporary')
      );
    });

    it('should create agent-global directory with subdirectories', async () => {
      vi.spyOn(fsUtils, 'ensureDir').mockResolvedValue(undefined);

      const result = await createAgentDirectory(
        Scope.AgentGlobal,
        'api-architect',
        undefined,
        mockGlobalRoot
      );

      expect(result).toBe(
        path.join(mockGlobalRoot, 'agents/api-architect')
      );
      expect(fsUtils.ensureDir).toHaveBeenCalledWith(
        path.join(mockGlobalRoot, 'agents/api-architect')
      );
      expect(fsUtils.ensureDir).toHaveBeenCalledWith(
        path.join(mockGlobalRoot, 'agents/api-architect/permanent')
      );
      expect(fsUtils.ensureDir).toHaveBeenCalledWith(
        path.join(mockGlobalRoot, 'agents/api-architect/temporary')
      );
    });

    it('should sanitise agent name before creating directory', async () => {
      vi.spyOn(fsUtils, 'ensureDir').mockResolvedValue(undefined);

      await createAgentDirectory(
        Scope.AgentProject,
        'TypeScript Expert', // Will be sanitised to typescript-expert
        mockProjectRoot
      );

      expect(fsUtils.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('typescript-expert')
      );
    });

    it('should be idempotent (no error if directory exists)', async () => {
      vi.spyOn(fsUtils, 'ensureDir').mockResolvedValue(undefined);

      const result1 = await createAgentDirectory(
        Scope.AgentProject,
        'typescript-expert',
        mockProjectRoot
      );

      const result2 = await createAgentDirectory(
        Scope.AgentProject,
        'typescript-expert',
        mockProjectRoot
      );

      expect(result1).toBe(result2);
      expect(fsUtils.ensureDir).toHaveBeenCalledTimes(6); // 3 calls × 2 invocations
    });
  });

  describe('agentDirectoryExists', () => {
    it('should return true when agent directory exists', async () => {
      const fsp = await import('node:fs/promises');
      vi.spyOn(fsp, 'access').mockResolvedValue(undefined);

      const result = await agentDirectoryExists(
        Scope.AgentProject,
        'typescript-expert',
        mockProjectRoot
      );

      expect(result).toBe(true);
    });

    it('should return false when agent directory does not exist', async () => {
      const fsp = await import('node:fs/promises');
      vi.spyOn(fsp, 'access').mockRejectedValue(new Error('ENOENT'));

      const result = await agentDirectoryExists(
        Scope.AgentProject,
        'nonexistent-agent',
        mockProjectRoot
      );

      expect(result).toBe(false);
    });

    it('should check agent-global directory path', async () => {
      const fsp = await import('node:fs/promises');
      const mockAccess = vi.spyOn(fsp, 'access').mockResolvedValue(undefined);

      await agentDirectoryExists(
        Scope.AgentGlobal,
        'api-architect',
        undefined,
        mockGlobalRoot
      );

      expect(mockAccess).toHaveBeenCalledWith(
        path.join(mockGlobalRoot, 'agents/api-architect')
      );
    });
  });
});
