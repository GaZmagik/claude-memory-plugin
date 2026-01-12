/**
 * T103: Unit tests for directory protection
 *
 * Tests the directory protection utilities that prevent
 * accidental modification of memory files.
 */

import { describe, it, expect } from 'vitest';
import {
  isProtectedPath,
  shouldBlockOperation,
  isAllowedOperation,
  getProtectionReason,
  type ToolOperation,
} from './directory-protection.js';

describe('Directory Protection', () => {
  describe('isProtectedPath', () => {
    it('should protect .claude/memory paths', () => {
      expect(isProtectedPath('.claude/memory/permanent/test.md')).toBe(true);
      expect(isProtectedPath('.claude/memory/')).toBe(true);
    });

    it('should protect paths with backslashes (Windows)', () => {
      expect(isProtectedPath('.claude\\memory\\permanent\\test.md')).toBe(true);
    });

    it('should protect home-based memory paths', () => {
      expect(isProtectedPath('~/.claude/memory/global.md')).toBe(true);
    });

    it('should not protect unrelated paths', () => {
      expect(isProtectedPath('src/index.ts')).toBe(false);
      expect(isProtectedPath('.claude/settings.json')).toBe(false);
    });

    it('should not protect paths that just contain memory', () => {
      expect(isProtectedPath('src/memory/cache.ts')).toBe(false);
    });
  });

  describe('shouldBlockOperation', () => {
    describe('Bash operations', () => {
      it('should block rm commands targeting memory', () => {
        const operation: ToolOperation = {
          tool: 'Bash',
          command: 'rm -rf .claude/memory/permanent/',
        };
        expect(shouldBlockOperation(operation)).toBe(true);
      });

      it('should block mv commands targeting memory', () => {
        const operation: ToolOperation = {
          tool: 'Bash',
          command: 'mv .claude/memory/old.md /tmp/',
        };
        expect(shouldBlockOperation(operation)).toBe(true);
      });

      it('should block redirects to memory', () => {
        const operation: ToolOperation = {
          tool: 'Bash',
          command: 'echo "test" > .claude/memory/test.md',
        };
        expect(shouldBlockOperation(operation)).toBe(true);
      });

      it('should block append redirects to memory', () => {
        const operation: ToolOperation = {
          tool: 'Bash',
          command: 'echo "test" >> .claude/memory/test.md',
        };
        expect(shouldBlockOperation(operation)).toBe(true);
      });

      it('should block tee to memory', () => {
        const operation: ToolOperation = {
          tool: 'Bash',
          command: 'cat file.txt | tee .claude/memory/output.md',
        };
        expect(shouldBlockOperation(operation)).toBe(true);
      });

      it('should allow read-only commands', () => {
        const operation: ToolOperation = {
          tool: 'Bash',
          command: 'cat .claude/memory/test.md',
        };
        expect(shouldBlockOperation(operation)).toBe(false);
      });

      it('should allow grep on memory', () => {
        const operation: ToolOperation = {
          tool: 'Bash',
          command: 'grep -r "pattern" .claude/memory/',
        };
        expect(shouldBlockOperation(operation)).toBe(false);
      });

      it('should allow ls on memory', () => {
        const operation: ToolOperation = {
          tool: 'Bash',
          command: 'ls -la .claude/memory/',
        };
        expect(shouldBlockOperation(operation)).toBe(false);
      });

      it('should block git rm (check isAllowedOperation for whitelist)', () => {
        // Note: shouldBlockOperation blocks rm commands, but isAllowedOperation
        // provides a whitelist check for special cases like git rm --cached
        const operation: ToolOperation = {
          tool: 'Bash',
          command: 'git rm --cached .claude/memory/test.md',
        };
        expect(shouldBlockOperation(operation)).toBe(true);
      });

      it('should allow memory commands', () => {
        const operation: ToolOperation = {
          tool: 'Bash',
          command: '~/.claude/skills/memory/memory write',
        };
        expect(shouldBlockOperation(operation)).toBe(false);
      });

      it('should return false for empty command', () => {
        const operation: ToolOperation = {
          tool: 'Bash',
          command: undefined,
        };
        expect(shouldBlockOperation(operation)).toBe(false);
      });

      it('should allow unrelated commands', () => {
        const operation: ToolOperation = {
          tool: 'Bash',
          command: 'npm install',
        };
        expect(shouldBlockOperation(operation)).toBe(false);
      });
    });

    describe('Write operations', () => {
      it('should block Write to memory path', () => {
        const operation: ToolOperation = {
          tool: 'Write',
          filePath: '.claude/memory/permanent/decision.md',
        };
        expect(shouldBlockOperation(operation)).toBe(true);
      });

      it('should allow Write to non-memory path', () => {
        const operation: ToolOperation = {
          tool: 'Write',
          filePath: 'src/index.ts',
        };
        expect(shouldBlockOperation(operation)).toBe(false);
      });

      it('should return false for Write without filePath', () => {
        const operation: ToolOperation = {
          tool: 'Write',
        };
        expect(shouldBlockOperation(operation)).toBe(false);
      });
    });

    describe('Edit operations', () => {
      it('should block Edit to memory path', () => {
        const operation: ToolOperation = {
          tool: 'Edit',
          filePath: '.claude/memory/temporary/think.md',
        };
        expect(shouldBlockOperation(operation)).toBe(true);
      });

      it('should allow Edit to non-memory path', () => {
        const operation: ToolOperation = {
          tool: 'Edit',
          filePath: 'package.json',
        };
        expect(shouldBlockOperation(operation)).toBe(false);
      });
    });

    describe('Read-only operations', () => {
      it('should allow Read operations', () => {
        const operation: ToolOperation = {
          tool: 'Read',
          filePath: '.claude/memory/permanent/test.md',
        };
        expect(shouldBlockOperation(operation)).toBe(false);
      });

      it('should allow Glob operations', () => {
        const operation: ToolOperation = {
          tool: 'Glob',
          pattern: '.claude/memory/**/*.md',
        };
        expect(shouldBlockOperation(operation)).toBe(false);
      });

      it('should allow Grep operations', () => {
        const operation: ToolOperation = {
          tool: 'Grep',
          pattern: 'search term',
          path: '.claude/memory/',
        };
        expect(shouldBlockOperation(operation)).toBe(false);
      });
    });

    describe('Unknown tools', () => {
      it('should allow unknown tools', () => {
        const operation: ToolOperation = {
          tool: 'UnknownTool',
        };
        expect(shouldBlockOperation(operation)).toBe(false);
      });
    });
  });

  describe('isAllowedOperation', () => {
    it('should return true for non-Bash tools', () => {
      const operation: ToolOperation = {
        tool: 'Read',
        filePath: '.claude/memory/test.md',
      };
      expect(isAllowedOperation(operation)).toBe(true);
    });

    it('should return true for Bash without command', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
      };
      expect(isAllowedOperation(operation)).toBe(true);
    });

    it('should allow git rm --cached', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
        command: 'git rm --cached .claude/memory/test.md',
      };
      expect(isAllowedOperation(operation)).toBe(true);
    });

    it('should allow memory commands', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
        command: '.claude/skills/memory/memory list',
      };
      expect(isAllowedOperation(operation)).toBe(true);
    });

    it('should allow read-only cat commands', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
        command: 'cat .claude/memory/test.md',
      };
      expect(isAllowedOperation(operation)).toBe(true);
    });

    it('should not allow cat with pipe to tee memory', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
        command: 'cat file.txt | tee .claude/memory/output.md',
      };
      expect(isAllowedOperation(operation)).toBe(false);
    });

    it('should return false for destructive commands', () => {
      const operation: ToolOperation = {
        tool: 'Bash',
        command: 'rm .claude/memory/test.md',
      };
      expect(isAllowedOperation(operation)).toBe(false);
    });
  });

  describe('getProtectionReason', () => {
    it('should return reason for protected path', () => {
      const reason = getProtectionReason('.claude/memory/test.md');
      expect(reason).toContain('protected memory directory');
    });

    it('should return empty string for unprotected path', () => {
      const reason = getProtectionReason('src/index.ts');
      expect(reason).toBe('');
    });
  });
});
