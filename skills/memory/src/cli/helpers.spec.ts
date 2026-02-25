/**
 * Tests for CLI helpers module
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  parseScope,
  parseMemoryType,
  getGlobalMemoryPath,
  resolveAgentScopePath,
  validateIncludeShared,
  scopeToIdentifier,
  getResolvedScopePath,
  resolveSharedScopePaths,
} from './helpers.js';
import { Scope, MemoryType } from '../types/enums.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

describe('CLI Helpers', () => {
  describe('parseScope', () => {
    it('should parse "global" to Scope.Global', () => {
      expect(parseScope('global')).toBe(Scope.Global);
    });

    it('should parse "user" to Scope.Global (alias)', () => {
      expect(parseScope('user')).toBe(Scope.Global);
    });

    it('should parse "project" to Scope.Project', () => {
      expect(parseScope('project')).toBe(Scope.Project);
    });

    it('should parse "local" to Scope.Local', () => {
      expect(parseScope('local')).toBe(Scope.Local);
    });

    it('should parse "enterprise" to Scope.Enterprise', () => {
      expect(parseScope('enterprise')).toBe(Scope.Enterprise);
    });

    it('should default to Scope.Project for undefined', () => {
      expect(parseScope(undefined)).toBe(Scope.Project);
    });

    it('should default to Scope.Project for unknown values', () => {
      expect(parseScope('unknown')).toBe(Scope.Project);
    });

    it('should be case-insensitive', () => {
      expect(parseScope('GLOBAL')).toBe(Scope.Global);
      expect(parseScope('Local')).toBe(Scope.Local);
    });

    it('should parse "agent-project" to Scope.AgentProject', () => {
      expect(parseScope('agent-project')).toBe(Scope.AgentProject);
    });

    it('should parse "agent-global" to Scope.AgentGlobal', () => {
      expect(parseScope('agent-global')).toBe(Scope.AgentGlobal);
    });

    it('should parse "agent" to Scope.AgentProject (default)', () => {
      expect(parseScope('agent')).toBe(Scope.AgentProject);
    });

    it('should handle agent scope strings case-insensitively', () => {
      expect(parseScope('AGENT-PROJECT')).toBe(Scope.AgentProject);
      expect(parseScope('Agent-Global')).toBe(Scope.AgentGlobal);
    });
  });

  describe('parseMemoryType', () => {
    it('should parse "decision" to MemoryType.Decision', () => {
      expect(parseMemoryType('decision')).toBe(MemoryType.Decision);
    });

    it('should parse "learning" to MemoryType.Learning', () => {
      expect(parseMemoryType('learning')).toBe(MemoryType.Learning);
    });

    it('should parse "artifact" to MemoryType.Artifact', () => {
      expect(parseMemoryType('artifact')).toBe(MemoryType.Artifact);
    });

    it('should parse "gotcha" to MemoryType.Gotcha', () => {
      expect(parseMemoryType('gotcha')).toBe(MemoryType.Gotcha);
    });

    it('should parse "breadcrumb" to MemoryType.Breadcrumb', () => {
      expect(parseMemoryType('breadcrumb')).toBe(MemoryType.Breadcrumb);
    });

    it('should parse "hub" to MemoryType.Hub', () => {
      expect(parseMemoryType('hub')).toBe(MemoryType.Hub);
    });

    it('should parse "rule" to MemoryType.Rule', () => {
      expect(parseMemoryType('rule')).toBe(MemoryType.Rule);
    });

    it('should parse "reminder" to MemoryType.Reminder', () => {
      expect(parseMemoryType('reminder')).toBe(MemoryType.Reminder);
    });

    it('should return undefined for undefined input', () => {
      expect(parseMemoryType(undefined)).toBeUndefined();
    });

    it('should return undefined for unknown values', () => {
      expect(parseMemoryType('unknown')).toBeUndefined();
    });

    it('should be case-insensitive', () => {
      expect(parseMemoryType('DECISION')).toBe(MemoryType.Decision);
      expect(parseMemoryType('Learning')).toBe(MemoryType.Learning);
    });
  });

  describe('getGlobalMemoryPath', () => {
    it('should return a path ending with .claude/memory', () => {
      const result = getGlobalMemoryPath();
      expect(result).toMatch(/\.claude\/memory$/);
    });
  });

  describe('validateIncludeShared', () => {
    it('returns valid when includeShared is false and agentName is undefined', () => {
      expect(validateIncludeShared(false, undefined)).toEqual({ valid: true });
    });

    it('returns valid when includeShared is false with an agentName', () => {
      expect(validateIncludeShared(false, 'typescript-expert')).toEqual({ valid: true });
    });

    it('returns invalid with error when includeShared is true and agentName is undefined', () => {
      const result = validateIncludeShared(true, undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('--include-shared requires --agent');
    });

    it('returns valid when includeShared is true with an agentName', () => {
      expect(validateIncludeShared(true, 'typescript-expert')).toEqual({ valid: true });
    });
  });

  describe('scopeToIdentifier', () => {
    it('returns "global" for Global scope', () => {
      expect(scopeToIdentifier(Scope.Global)).toBe('global');
    });

    it('returns "project" for Project scope', () => {
      expect(scopeToIdentifier(Scope.Project)).toBe('project');
    });

    it('returns "local" for Local scope', () => {
      expect(scopeToIdentifier(Scope.Local)).toBe('local');
    });

    it('returns "enterprise" for Enterprise scope', () => {
      expect(scopeToIdentifier(Scope.Enterprise)).toBe('enterprise');
    });

    it('returns "agent-project" for AgentProject scope', () => {
      expect(scopeToIdentifier(Scope.AgentProject)).toBe('agent-project');
    });

    it('returns "agent-global" for AgentGlobal scope', () => {
      expect(scopeToIdentifier(Scope.AgentGlobal)).toBe('agent-global');
    });
  });

  describe('resolveAgentScopePath', () => {
    let originalCwd: string;
    let tempDir: string;

    beforeEach(() => {
      originalCwd = process.cwd();
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-test-'));
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe('valid agent names', () => {
      it('returns a path containing the agent name for default scope', () => {
        const result = resolveAgentScopePath('typescript-expert');
        expect(typeof result).toBe('string');
        expect(result).toContain('typescript-expert');
      });

      it('returns a path for explicit project scope', () => {
        const result = resolveAgentScopePath('typescript-expert', 'project');
        expect(result).toContain('typescript-expert');
      });

      it('returns a path for explicit global scope', () => {
        const result = resolveAgentScopePath('rust-expert', 'global');
        expect(result).toContain('rust-expert');
      });

      it('returns a path for agent-project scope string', () => {
        const result = resolveAgentScopePath('api-architect', 'agent-project');
        expect(result).toContain('api-architect');
      });

      it('returns a path for agent-global scope string', () => {
        const result = resolveAgentScopePath('frontend-expert', 'agent-global');
        expect(result).toContain('frontend-expert');
      });

      it('accepts agent names containing hyphens', () => {
        const result = resolveAgentScopePath('typescript-expert-v2');
        expect(result).toContain('typescript-expert-v2');
      });

      it('accepts agent names containing numbers', () => {
        const result = resolveAgentScopePath('agent-2024');
        expect(result).toContain('agent-2024');
      });
    });

    describe('invalid agent names', () => {
      it('throws for name containing a slash', () => {
        expect(() => resolveAgentScopePath('invalid/name')).toThrow();
      });

      it('throws for name containing a space', () => {
        expect(() => resolveAgentScopePath('invalid name')).toThrow();
      });

      it('throws for name containing @', () => {
        expect(() => resolveAgentScopePath('invalid@name')).toThrow();
      });

      it('throws for empty string', () => {
        expect(() => resolveAgentScopePath('')).toThrow();
      });

      it('throws for whitespace-only string', () => {
        expect(() => resolveAgentScopePath('   ')).toThrow();
      });

      it('throws for reserved name "project"', () => {
        expect(() => resolveAgentScopePath('project')).toThrow();
      });

      it('throws for name starting with a hyphen', () => {
        expect(() => resolveAgentScopePath('-invalid')).toThrow();
      });

      it('throws for name ending with a hyphen', () => {
        expect(() => resolveAgentScopePath('invalid-')).toThrow();
      });

      it('throws for name with consecutive hyphens', () => {
        expect(() => resolveAgentScopePath('invalid--name')).toThrow();
      });
    });
  });

  describe('getResolvedScopePath', () => {
    let originalCwd: string;
    let tempDir: string;

    beforeEach(() => {
      originalCwd = process.cwd();
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-test-'));
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns an absolute path for Global scope rooted at home directory', () => {
      const result = getResolvedScopePath(Scope.Global);
      expect(typeof result).toBe('string');
      expect(result).toContain(os.homedir());
      expect(result).toMatch(/\.claude\/memory/);
    });

    it('returns a path within cwd for Project scope', () => {
      const result = getResolvedScopePath(Scope.Project);
      expect(typeof result).toBe('string');
      expect(result).toContain(tempDir);
    });

    it('returns a path within cwd for Local scope', () => {
      const result = getResolvedScopePath(Scope.Local);
      expect(typeof result).toBe('string');
      expect(result).toContain(tempDir);
    });

    it('returns different paths for different scopes', () => {
      const globalPath = getResolvedScopePath(Scope.Global);
      const projectPath = getResolvedScopePath(Scope.Project);
      expect(globalPath).not.toBe(projectPath);
    });
  });

  describe('resolveSharedScopePaths', () => {
    let originalCwd: string;
    let tempDir: string;

    beforeEach(() => {
      originalCwd = process.cwd();
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-test-'));
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns a non-empty array', () => {
      const paths = resolveSharedScopePaths('typescript-expert');
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
    });

    it('first path contains the agent name', () => {
      const paths = resolveSharedScopePaths('typescript-expert');
      expect(paths[0]).toContain('typescript-expert');
    });

    it('returns more than one path (agent + shared scopes)', () => {
      const paths = resolveSharedScopePaths('typescript-expert');
      expect(paths.length).toBeGreaterThan(1);
    });

    it('all returned values are strings', () => {
      const paths = resolveSharedScopePaths('typescript-expert');
      for (const p of paths) {
        expect(typeof p).toBe('string');
      }
    });

    it('throws for an invalid agent name', () => {
      expect(() => resolveSharedScopePaths('invalid/name')).toThrow();
    });

    it('first path differs between project and global scope strings', () => {
      const projectPaths = resolveSharedScopePaths('typescript-expert', 'project');
      const globalPaths = resolveSharedScopePaths('typescript-expert', 'global');
      expect(projectPaths[0]).not.toBe(globalPaths[0]);
    });
  });
});
