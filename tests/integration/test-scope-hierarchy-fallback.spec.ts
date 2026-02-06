/**
 * Integration Tests for Scope Hierarchy Fallback (Phase G - T134)
 *
 * Tests that agent scope correctly falls back to project scope
 * when memories exist only at project level.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { Scope, MemoryType } from '../../skills/memory/src/types/enums.js';
import { resolveScope } from '../../skills/memory/src/scope/resolver.js';
import { getAgentDirectoryPath } from '../../skills/memory/src/scope/get-agent-directory-path.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Agent scope hierarchy fallback', () => {
  let testDir: string;
  let memoryDir: string;
  let globalMemoryDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-fallback-test-'));
    memoryDir = path.join(testDir, '.claude', 'memory');
    globalMemoryDir = path.join(testDir, 'global-memory');
    fs.mkdirSync(path.join(testDir, '.git'));
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.mkdirSync(globalMemoryDir, { recursive: true });
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Scope resolution with agent context', () => {
    it('should resolve agent-project scope to agents/ subdirectory', () => {
      const result = resolveScope({
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        requestedScope: Scope.AgentProject,
        agentName: 'typescript-pro',
      });

      expect(result.scope).toBe(Scope.AgentProject);
      expect(result.path).toContain('agents');
      expect(result.path).toContain('typescript-pro');
    });

    it('should resolve agent-global scope to global agents/ subdirectory', () => {
      const result = resolveScope({
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        requestedScope: Scope.AgentGlobal,
        agentName: 'rust-expert',
      });

      expect(result.scope).toBe(Scope.AgentGlobal);
      expect(result.path).toContain('agents');
      expect(result.path).toContain('rust-expert');
    });

    it('should fall back to project scope when no agent specified', () => {
      const result = resolveScope({
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        requestedScope: Scope.Project,
      });

      expect(result.scope).toBe(Scope.Project);
      expect(result.path).not.toContain('agents');
    });
  });

  describe('Agent scope path isolation', () => {
    it('should produce different paths for different agents', () => {
      const path1 = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'agent-alpha',
        projectRoot: testDir,
      });

      const path2 = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'agent-beta',
        projectRoot: testDir,
      });

      expect(path1).not.toBe(path2);
      expect(path1).toContain('agent-alpha');
      expect(path2).toContain('agent-beta');
    });

    it('should produce different paths for project vs global agent scope', () => {
      const projectPath = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'typescript-pro',
        projectRoot: testDir,
      });

      const globalPath = getAgentDirectoryPath({
        scope: Scope.AgentGlobal,
        agentName: 'typescript-pro',
        globalRoot: globalMemoryDir,
      });

      expect(projectPath).not.toBe(globalPath);
      expect(projectPath).toContain(testDir);
      expect(globalPath).toContain(globalMemoryDir);
    });
  });

  describe('Memory visibility across scopes', () => {
    it('should NOT see agent memories from project scope', async () => {
      // Write an agent-scoped memory
      await writeMemory({
        id: 'learning-agent-only',
        type: MemoryType.Learning,
        title: 'Agent Only',
        content: 'Only visible to the agent.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'private-agent',
        projectRoot: testDir,
      });

      // Try to read from project scope — should NOT find it
      const result = await readMemory({
        id: 'learning-agent-only',
        basePath: memoryDir,
      });

      expect(result.status).toBe('error');
    });

    it('should NOT see project memories from agent scope', async () => {
      // Write a project-scoped memory
      await writeMemory({
        id: 'learning-project-only',
        type: MemoryType.Learning,
        title: 'Project Only',
        content: 'Only visible at project level.',
        tags: ['testing'],
        scope: Scope.Project,
        basePath: memoryDir,
      });

      // Try to read from agent scope — should NOT find it
      const agentDir = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'some-agent',
        projectRoot: testDir,
      });
      const result = await readMemory({
        id: 'learning-project-only',
        basePath: agentDir,
      });

      expect(result.status).toBe('error');
    });

    it('should keep agent memories separate from each other', async () => {
      // Write to agent A
      await writeMemory({
        id: 'learning-agent-a-secret',
        type: MemoryType.Learning,
        title: 'Agent A Secret',
        content: 'Private to agent A.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'agent-a',
        projectRoot: testDir,
      });

      // Try to read from agent B
      const agentBDir = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'agent-b',
        projectRoot: testDir,
      });
      const crossRead = await readMemory({
        id: 'learning-agent-a-secret',
        basePath: agentBDir,
      });

      expect(crossRead.status).toBe('error');
    });
  });

  describe('Scope resolution error handling', () => {
    it('should require agentName for agent-project scope', () => {
      const result = resolveScope({
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        requestedScope: Scope.AgentProject,
      });

      expect(result.scope).toBeNull();
      expect(result.error).toContain('agentName');
    });

    it('should require agentName for agent-global scope', () => {
      const result = resolveScope({
        cwd: testDir,
        globalMemoryPath: globalMemoryDir,
        requestedScope: Scope.AgentGlobal,
      });

      expect(result.scope).toBeNull();
      expect(result.error).toContain('agentName');
    });
  });
});
