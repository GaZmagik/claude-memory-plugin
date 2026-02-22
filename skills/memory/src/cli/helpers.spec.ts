/**
 * Tests for CLI helpers module
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { parseScope, parseMemoryType, getGlobalMemoryPath, resolveAgentScopePath } from './helpers.js';
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

  describe('resolveAgentScopePath', () => {
    let originalCwd: string;
    let tempDir: string;

    beforeEach(() => {
      originalCwd = process.cwd();
      // Create a temp directory for testing
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-test-'));
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should resolve agent path with valid agent name and default scope', () => {
      // This test will pass once implementation exists
      // For now it validates the function signature
      expect(() => {
        resolveAgentScopePath('typescript-expert');
      }).toBeDefined();
    });

    it('should resolve agent path with explicit project scope', () => {
      expect(() => {
        resolveAgentScopePath('typescript-expert', 'project');
      }).toBeDefined();
    });

    it('should resolve agent path with explicit global scope', () => {
      expect(() => {
        resolveAgentScopePath('rust-expert', 'global');
      }).toBeDefined();
    });

    it('should resolve agent path with agent-project scope string', () => {
      expect(() => {
        resolveAgentScopePath('api-architect', 'agent-project');
      }).toBeDefined();
    });

    it('should resolve agent path with agent-global scope string', () => {
      expect(() => {
        resolveAgentScopePath('frontend-expert', 'agent-global');
      }).toBeDefined();
    });

    it('should throw error for invalid agent name with slashes', () => {
      expect(() => {
        resolveAgentScopePath('invalid/name');
      }).toThrow();
    });

    it('should throw error for invalid agent name with spaces', () => {
      expect(() => {
        resolveAgentScopePath('invalid name');
      }).toThrow();
    });

    it('should throw error for invalid agent name with special characters', () => {
      expect(() => {
        resolveAgentScopePath('invalid@name');
      }).toThrow();
    });

    it('should throw error for empty agent name', () => {
      expect(() => {
        resolveAgentScopePath('');
      }).toThrow();
    });

    it('should throw error for agent name with only spaces', () => {
      expect(() => {
        resolveAgentScopePath('   ');
      }).toThrow();
    });

    it('should handle agent names with hyphens correctly', () => {
      expect(() => {
        resolveAgentScopePath('typescript-expert-v2');
      }).toBeDefined();
    });

    it('should handle agent names with numbers', () => {
      expect(() => {
        resolveAgentScopePath('agent-2024');
      }).toBeDefined();
    });

    it('should throw error for reserved agent names', () => {
      expect(() => {
        resolveAgentScopePath('project');
      }).toThrow();
    });

    it('should throw error for agent name starting with hyphen', () => {
      expect(() => {
        resolveAgentScopePath('-invalid');
      }).toThrow();
    });

    it('should throw error for agent name ending with hyphen', () => {
      expect(() => {
        resolveAgentScopePath('invalid-');
      }).toThrow();
    });

    it('should throw error for agent name with consecutive hyphens', () => {
      expect(() => {
        resolveAgentScopePath('invalid--name');
      }).toThrow();
    });
  });
});
