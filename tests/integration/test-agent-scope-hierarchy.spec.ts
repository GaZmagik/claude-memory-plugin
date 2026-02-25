import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveScope } from '../../skills/memory/src/scope/resolver.js';
import { Scope } from '../../skills/memory/src/types/enums.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Agent scope hierarchy resolution (integration)', () => {
  let tempDir: string;
  let globalMemoryPath: string;

  beforeEach(() => {
    // Create temporary directories for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-scope-test-'));
    globalMemoryPath = path.join(tempDir, '.claude', 'memory');
    fs.mkdirSync(globalMemoryPath, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Agent-project scope resolution', () => {
    it('should resolve agent-project scope when requested explicitly', () => {
      const result = resolveScope({
        cwd: tempDir,
        globalMemoryPath,
        requestedScope: Scope.AgentProject,
        agentName: 'typescript-expert',
      });

      expect(result.scope).toBe(Scope.AgentProject);
      expect(result.path).toContain('agents');
      expect(result.path).toContain('typescript-expert');
      expect(result.error).toBeUndefined();
    });

    it('should include agent name in resolved path', () => {
      const result = resolveScope({
        cwd: tempDir,
        globalMemoryPath,
        requestedScope: Scope.AgentProject,
        agentName: 'rust-systems',
      });

      expect(result.path).toContain('rust-systems');
    });

    it('should require agentName parameter for agent-project scope', () => {
      const result = resolveScope({
        cwd: tempDir,
        globalMemoryPath,
        requestedScope: Scope.AgentProject,
      });

      expect(result.scope).toBeNull();
      expect(result.error).toContain('agentName is required');
    });
  });

  describe('Agent-global scope resolution', () => {
    it('should resolve agent-global scope when requested explicitly', () => {
      const result = resolveScope({
        cwd: tempDir,
        globalMemoryPath,
        requestedScope: Scope.AgentGlobal,
        agentName: 'typescript-expert',
      });

      expect(result.scope).toBe(Scope.AgentGlobal);
      expect(result.path).toContain('agents');
      expect(result.path).toContain('typescript-expert');
      expect(result.error).toBeUndefined();
    });

    it('should use globalMemoryPath for agent-global', () => {
      const result = resolveScope({
        cwd: tempDir,
        globalMemoryPath,
        requestedScope: Scope.AgentGlobal,
        agentName: 'typescript-expert',
      });

      expect(result.path).toContain(globalMemoryPath);
    });

    it('should require agentName parameter for agent-global scope', () => {
      const result = resolveScope({
        cwd: tempDir,
        globalMemoryPath,
        requestedScope: Scope.AgentGlobal,
      });

      expect(result.scope).toBeNull();
      expect(result.error).toContain('agentName is required');
    });
  });

  describe('Scope hierarchy with agent context', () => {
    it('should distinguish agent-project from project scope', () => {
      const projectResult = resolveScope({
        cwd: tempDir,
        globalMemoryPath,
        requestedScope: Scope.Project,
      });

      const agentProjectResult = resolveScope({
        cwd: tempDir,
        globalMemoryPath,
        requestedScope: Scope.AgentProject,
        agentName: 'typescript-expert',
      });

      expect(projectResult.scope).toBe(Scope.Project);
      expect(agentProjectResult.scope).toBe(Scope.AgentProject);
      expect(projectResult.path).not.toBe(agentProjectResult.path);
      expect(agentProjectResult.path).toContain('agents');
      expect(projectResult.path).not.toContain('agents');
    });

    it('should distinguish agent-global from global scope', () => {
      const globalResult = resolveScope({
        cwd: tempDir,
        globalMemoryPath,
        requestedScope: Scope.Global,
      });

      const agentGlobalResult = resolveScope({
        cwd: tempDir,
        globalMemoryPath,
        requestedScope: Scope.AgentGlobal,
        agentName: 'typescript-expert',
      });

      expect(globalResult.scope).toBe(Scope.Global);
      expect(agentGlobalResult.scope).toBe(Scope.AgentGlobal);
      expect(globalResult.path).not.toBe(agentGlobalResult.path);
      expect(agentGlobalResult.path).toContain('agents');
      expect(globalResult.path).not.toContain('agents');
    });
  });

  describe('Error handling', () => {
    it('should fail gracefully when agentName is invalid', () => {
      const result = resolveScope({
        cwd: tempDir,
        globalMemoryPath,
        requestedScope: Scope.AgentProject,
        agentName: 'Invalid Name!',
      });

      expect(result.scope).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should fail gracefully when agentName is empty', () => {
      const result = resolveScope({
        cwd: tempDir,
        globalMemoryPath,
        requestedScope: Scope.AgentGlobal,
        agentName: '',
      });

      expect(result.scope).toBeNull();
      expect(result.error).toContain('agentName');
    });
  });

  describe('Backward compatibility', () => {
    it('should not affect non-agent scope resolution', () => {
      const projectResult = resolveScope({
        cwd: tempDir,
        globalMemoryPath,
        requestedScope: Scope.Project,
      });

      expect(projectResult.scope).toBe(Scope.Project);
      expect(projectResult.error).toBeUndefined();
    });

    it('should resolve all existing scopes without agentName', () => {
      const scopes = [Scope.Project, Scope.Global, Scope.Local];

      scopes.forEach(scope => {
        const result = resolveScope({
          cwd: tempDir,
          globalMemoryPath,
          requestedScope: scope,
        });

        expect(result.scope).toBe(scope);
        expect(result.error).toBeUndefined();
      });
    });
  });
});
