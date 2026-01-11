/**
 * T107: Integration test for memory directory protection
 *
 * Tests that the memory directory is protected from
 * accidental modification or deletion.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import {
  shouldBlockOperation,
  isProtectedPath,
  isAllowedOperation,
  getProtectionReason,
  ToolOperation,
} from '../../hooks/src/memory/directory-protection.js';

describe('Directory Protection Integration', () => {
  let testDir: string;
  let memoryDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'dir-protect-'));
    memoryDir = path.join(testDir, '.claude', 'memory');
    fs.mkdirSync(memoryDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('isProtectedPath', () => {
    it('should protect .claude/memory directory', () => {
      expect(isProtectedPath('.claude/memory')).toBe(true);
      expect(isProtectedPath('.claude/memory/')).toBe(true);
      expect(isProtectedPath('.claude/memory/permanent')).toBe(true);
    });

    it('should protect ~/.claude/memory', () => {
      expect(isProtectedPath('~/.claude/memory')).toBe(true);
      expect(isProtectedPath('/home/user/.claude/memory')).toBe(true);
    });

    it('should protect nested memory paths', () => {
      expect(isProtectedPath('.claude/memory/permanent/decision-123.md')).toBe(true);
      expect(isProtectedPath('.claude/memory/temporary/note.md')).toBe(true);
      expect(isProtectedPath('.claude/memory/graph.json')).toBe(true);
      expect(isProtectedPath('.claude/memory/index.json')).toBe(true);
    });

    it('should not protect other .claude directories', () => {
      expect(isProtectedPath('.claude/settings.json')).toBe(false);
      expect(isProtectedPath('.claude/hooks')).toBe(false);
      expect(isProtectedPath('.claude/commands')).toBe(false);
    });

    it('should not protect unrelated paths', () => {
      expect(isProtectedPath('src/index.ts')).toBe(false);
      expect(isProtectedPath('package.json')).toBe(false);
      expect(isProtectedPath('memory/other.txt')).toBe(false);
    });
  });

  describe('shouldBlockOperation', () => {
    it('should block rm on memory directory', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
        command: 'rm -rf .claude/memory',
      };

      expect(shouldBlockOperation(operation)).toBe(true);
    });

    it('should block rm on memory files', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
        command: 'rm .claude/memory/permanent/decision-123.md',
      };

      expect(shouldBlockOperation(operation)).toBe(true);
    });

    it('should block Write tool to memory directory', () => {
      const operation: ToolOperation = {
        tool: 'Write',
        filePath: '.claude/memory/permanent/fake-memory.md',
      };

      expect(shouldBlockOperation(operation)).toBe(true);
    });

    it('should block Edit tool on memory files', () => {
      const operation: ToolOperation = {
        tool: 'Edit',
        filePath: '.claude/memory/index.json',
      };

      expect(shouldBlockOperation(operation)).toBe(true);
    });

    it('should allow Read tool on memory files', () => {
      const operation: ToolOperation = {
        tool: 'Read',
        filePath: '.claude/memory/permanent/decision-123.md',
      };

      expect(shouldBlockOperation(operation)).toBe(false);
    });

    it('should allow Glob on memory directory', () => {
      const operation: ToolOperation = {
        tool: 'Glob',
        pattern: '.claude/memory/**/*.md',
      };

      expect(shouldBlockOperation(operation)).toBe(false);
    });

    it('should allow Grep in memory directory', () => {
      const operation: ToolOperation = {
        tool: 'Grep',
        pattern: 'decision',
        path: '.claude/memory',
      };

      expect(shouldBlockOperation(operation)).toBe(false);
    });
  });

  describe('isAllowedOperation', () => {
    it('should allow git rm --cached on memory', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
        command: 'git rm --cached .claude/memory/index.json',
      };

      expect(isAllowedOperation(operation)).toBe(true);
    });

    it('should allow memory skill commands', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
        command: '~/.claude/skills/memory/memory.sh write',
      };

      expect(isAllowedOperation(operation)).toBe(true);
    });

    it('should allow cat/head/tail for reading', () => {
      const catOp: ToolOperation = {
        tool: 'Bash',
        command: 'cat .claude/memory/permanent/decision.md',
      };

      const headOp: ToolOperation = {
        tool: 'Bash',
        command: 'head -20 .claude/memory/index.json',
      };

      expect(isAllowedOperation(catOp)).toBe(true);
      expect(isAllowedOperation(headOp)).toBe(true);
    });

    it('should not allow echo/printf to memory files', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
        command: 'echo "malicious" > .claude/memory/index.json',
      };

      expect(isAllowedOperation(operation)).toBe(false);
    });

    it('should not allow mv/cp to memory directory', () => {
      const mvOp: ToolOperation = {
        tool: 'Bash',
        command: 'mv bad.md .claude/memory/permanent/',
      };

      const cpOp: ToolOperation = {
        tool: 'Bash',
        command: 'cp evil.json .claude/memory/index.json',
      };

      expect(isAllowedOperation(mvOp)).toBe(false);
      expect(isAllowedOperation(cpOp)).toBe(false);
    });
  });

  describe('getProtectionReason', () => {
    it('should explain why path is protected', () => {
      const reason = getProtectionReason('.claude/memory/permanent/decision.md');

      expect(reason).toContain('memory');
      expect(reason.length).toBeGreaterThan(10);
    });

    it('should suggest using memory skill', () => {
      const reason = getProtectionReason('.claude/memory/index.json');

      expect(reason).toContain('memory');
    });

    it('should return empty for unprotected paths', () => {
      const reason = getProtectionReason('src/index.ts');

      expect(reason).toBe('');
    });
  });

  describe('Edge cases', () => {
    it('should handle paths with spaces', () => {
      expect(isProtectedPath('.claude/memory/permanent/my decision.md')).toBe(true);
    });

    it('should handle absolute paths', () => {
      expect(isProtectedPath('/home/user/project/.claude/memory')).toBe(true);
    });

    it('should handle Windows-style paths', () => {
      expect(isProtectedPath('.claude\\memory\\permanent')).toBe(true);
    });

    it('should not be fooled by path traversal', () => {
      expect(isProtectedPath('.claude/../.claude/memory')).toBe(true);
      expect(isProtectedPath('src/../../.claude/memory')).toBe(true);
    });

    it('should handle commands with pipes', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
        command: 'cat file.txt | tee .claude/memory/bad.md',
      };

      expect(shouldBlockOperation(operation)).toBe(true);
    });

    it('should handle commands with semicolons', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
        command: 'echo ok; rm .claude/memory/index.json',
      };

      expect(shouldBlockOperation(operation)).toBe(true);
    });

    it('should handle commands with &&', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
        command: 'test -f x && rm -rf .claude/memory',
      };

      expect(shouldBlockOperation(operation)).toBe(true);
    });
  });
});
