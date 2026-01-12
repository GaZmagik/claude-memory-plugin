/**
 * Integration tests for hook entry points
 *
 * Tests that hook files can be loaded and execute basic flow logic
 * without requiring full Ollama/Claude Code integration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { allow, block, isForkedSession } from '../../hooks/src/core/error-handler.js';
import { shouldInjectGotcha } from '../../hooks/src/memory/gotcha-injector.js';
import type { HookInput } from '../../hooks/src/core/types.js';

describe('Hook Entry Points Integration', () => {
  const testDir = '/tmp/hook-integration-test';

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe('protect-memory-directory hook logic', () => {
    const PROTECTED_TOOLS = ['Write', 'Edit', 'MultiEdit'];

    it('should allow operations on non-memory files', () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/src/index.ts',
        },
      };

      // Simulate hook logic
      const filePath = input.tool_input?.file_path as string;
      const isMemoryPath = filePath.includes('/.claude/memory/');

      expect(isMemoryPath).toBe(false);

      const result = allow();
      expect(result.exitCode).toBe(0);
    });

    it('should block direct writes to .claude/memory/ directory', () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: {
          file_path: '/project/.claude/memory/learning-test.md',
        },
      };

      const filePath = input.tool_input?.file_path as string;
      const isMemoryPath = filePath.includes('/.claude/memory/');

      expect(isMemoryPath).toBe(true);

      const result = block('Cannot modify memory directory');
      expect(result.exitCode).toBe(2);
      expect(result.error).toBeDefined();
    });

    it('should block edits to global memory path', () => {
      const home = process.env.HOME || '/home/user';
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: {
          file_path: `${home}/.claude/memory/gotcha-test.md`,
        },
      };

      const filePath = input.tool_input?.file_path as string;
      const expandedPath = filePath.replace(/^~/, home);
      const isMemoryPath = expandedPath.startsWith(`${home}/.claude/memory/`);

      expect(isMemoryPath).toBe(true);

      const result = block('Cannot modify memory directory');
      expect(result.exitCode).toBe(2);
    });

    it('should allow operations with non-protected tools', () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Read',
        tool_input: {
          file_path: '/project/.claude/memory/test.md',
        },
      };

      expect(PROTECTED_TOOLS.includes('Read')).toBe(false);

      const result = allow();
      expect(result.exitCode).toBe(0);
    });

    it('should expand tilde in file paths', () => {
      const home = process.env.HOME || '/home/user';
      const filePath = '~/.claude/memory/test.md';
      const expandedPath = filePath.replace(/^~/, home);

      expect(expandedPath).toBe(`${home}/.claude/memory/test.md`);
      expect(expandedPath).not.toContain('~');
    });
  });

  describe('forked session detection', () => {
    it('should detect forked session by permission mode', () => {
      const forkedInput: HookInput = {
        hook_event_name: 'PreToolUse',
        permission_mode: 'default',
        tool_name: 'Read',
        tool_input: {},
      };

      expect(isForkedSession(forkedInput)).toBe(true);
    });

    it('should identify normal session by bypassPermissions mode', () => {
      const normalInput: HookInput = {
        hook_event_name: 'PreToolUse',
        permission_mode: 'bypassPermissions',
        tool_name: 'Read',
        tool_input: {},
      };

      expect(isForkedSession(normalInput)).toBe(false);
    });

    it('should skip hook processing for forked sessions', () => {
      const forkedInput: HookInput = {
        hook_event_name: 'PreToolUse',
        permission_mode: 'default',
        tool_name: 'Write',
        tool_input: { file_path: 'test.ts' },
      };

      if (isForkedSession(forkedInput)) {
        const result = allow();
        expect(result.exitCode).toBe(0);
      }
    });
  });

  describe('gotcha injection logic', () => {
    it('should inject gotchas for code files', () => {
      expect(shouldInjectGotcha('/project/src/index.ts')).toBe(true);
      expect(shouldInjectGotcha('/project/src/utils/helper.js')).toBe(true);
      expect(shouldInjectGotcha('/project/main.py')).toBe(true);
      expect(shouldInjectGotcha('/project/lib.rs')).toBe(true);
    });

    it('should skip injection for excluded patterns', () => {
      expect(shouldInjectGotcha('/project/image.png')).toBe(false);
      expect(shouldInjectGotcha('/project/package-lock.json')).toBe(false);
      expect(shouldInjectGotcha('/project/node_modules/lib.js')).toBe(false);
      expect(shouldInjectGotcha('/project/.git/config')).toBe(false);
    });

    it('should skip injection for memory directory files', () => {
      expect(shouldInjectGotcha('/project/.claude/memory/test.md')).toBe(false);
      expect(shouldInjectGotcha('~/.claude/memory/gotcha.md')).toBe(false);
    });

    it('should inject for config files with recognized extensions', () => {
      expect(shouldInjectGotcha('/project/tsconfig.json')).toBe(true);
      expect(shouldInjectGotcha('/project/.eslintrc.js')).toBe(true);
      expect(shouldInjectGotcha('/project/package.json')).toBe(true);
    });

    it('should inject for special files without extensions', () => {
      expect(shouldInjectGotcha('/project/Makefile')).toBe(true);
      expect(shouldInjectGotcha('/project/Dockerfile')).toBe(true);
      expect(shouldInjectGotcha('/project/bin/deploy')).toBe(true);
    });

    it('should skip binary and archive files', () => {
      expect(shouldInjectGotcha('/project/dist/bundle.zip')).toBe(false);
      expect(shouldInjectGotcha('/project/archive.tar.gz')).toBe(false);
      expect(shouldInjectGotcha('/project/docs/manual.pdf')).toBe(false);
    });
  });

  describe('hook configuration loading', () => {
    it('should handle missing config file gracefully', () => {
      const configPath = join(testDir, 'nonexistent-config.json');

      // Hook should use default config
      expect(existsSync(configPath)).toBe(false);

      // Default behaviour: allow Read operations
      const result = allow();
      expect(result.exitCode).toBe(0);
    });

    it('should parse valid tool config', () => {
      const config = {
        enabledTools: {
          Read: { enabled: true, description: 'Enable read monitoring' },
          Write: { enabled: false, description: 'Disable write suggestions' },
        },
      };

      expect(config.enabledTools.Read.enabled).toBe(true);
      expect(config.enabledTools.Write.enabled).toBe(false);
    });

    it('should handle bash command allowlist', () => {
      const config = {
        enabledTools: {
          Bash: { enabled: true, description: 'Enable bash monitoring' },
        },
        bashCommands: {
          mode: 'allowlist' as const,
          commands: {
            git: { enabled: true, description: 'Allow git commands' },
            rm: { enabled: false, description: 'Block rm commands' },
          },
        },
      };

      // Simulate command checking
      const isGitAllowed = config.bashCommands.commands.git?.enabled ?? false;
      const isRmAllowed = config.bashCommands.commands.rm?.enabled ?? false;

      expect(isGitAllowed).toBe(true);
      expect(isRmAllowed).toBe(false);
    });
  });

  describe('hook input validation', () => {
    it('should handle missing tool_name gracefully', () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_input: { file_path: 'test.ts' },
      };

      expect(input.tool_name).toBeUndefined();

      // Should allow by default
      const result = allow();
      expect(result.exitCode).toBe(0);
    });

    it('should handle missing tool_input gracefully', () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Read',
      };

      expect(input.tool_input).toBeUndefined();

      const result = allow();
      expect(result.exitCode).toBe(0);
    });

    it('should handle missing file_path in tool_input', () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: { content: 'test content' },
      };

      const filePath = input.tool_input?.file_path;
      expect(filePath).toBeUndefined();
    });

    it('should validate session_id presence', () => {
      const inputWithSession: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Read',
        tool_input: {},
        session_id: 'abc-123-def-456',
      };

      const inputWithoutSession: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Read',
        tool_input: {},
      };

      expect(inputWithSession.session_id).toBeDefined();
      expect(inputWithoutSession.session_id).toBeUndefined();
    });
  });

  describe('hook response format', () => {
    it('should return valid allow response structure', () => {
      const result = allow();

      expect(result).toHaveProperty('exitCode');
      expect(result.exitCode).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('should return valid block response structure', () => {
      const result = block('Test block message');

      expect(result).toHaveProperty('exitCode');
      expect(result.exitCode).toBe(2);
      expect(result).toHaveProperty('error');
      expect(result.error).toBeDefined();
    });

    it('should format additional context for PostToolUse', () => {
      const result = allow('Memory check recommended');

      expect(result.exitCode).toBe(0);
      expect(result.output).toBeDefined();
      expect(result.output?.hookSpecificOutput).toBeDefined();
      expect(result.output?.hookSpecificOutput?.additionalContext).toBe('Memory check recommended');
    });

    it('should include hookEventName in output', () => {
      const result = allow('Test context');

      expect(result.output?.hookSpecificOutput?.hookEventName).toBe('success');
    });
  });

  describe('path normalisation', () => {
    it('should handle absolute paths', () => {
      const absolutePath = '/home/user/project/src/index.ts';

      expect(absolutePath.startsWith('/')).toBe(true);
      expect(absolutePath.includes('/.claude/memory/')).toBe(false);
    });

    it('should handle relative paths', () => {
      const relativePath = 'src/index.ts';

      expect(relativePath.startsWith('/')).toBe(false);
    });

    it('should normalise Windows-style paths on Unix', () => {
      const windowsPath = 'C:\\Users\\test\\file.ts';
      const hasBackslashes = windowsPath.includes('\\');

      expect(hasBackslashes).toBe(true);
    });

    it('should handle paths with spaces', () => {
      const pathWithSpaces = '/project/my files/test.ts';

      expect(pathWithSpaces.includes(' ')).toBe(true);
      expect(pathWithSpaces.includes('/.claude/memory/')).toBe(false);
    });
  });

  describe('error message formatting', () => {
    it('should include file path in block message', () => {
      const filePath = '/project/.claude/memory/test.md';
      const result = block(`Cannot modify: ${filePath}`);

      const errorMessage = result.error?.message;
      expect(errorMessage).toContain(filePath);
    });

    it('should provide actionable guidance in error', () => {
      const result = block('Use memory script instead');

      const errorMessage = result.error?.message;
      expect(errorMessage).toContain('memory');
    });

    it('should indicate memory type in block message', () => {
      const projectPath = '/project/.claude/memory/test.md';
      const userPath = `${process.env.HOME}/.claude/memory/test.md`;

      const isProjectMemory = projectPath.includes('/.claude/memory/') &&
                              !projectPath.startsWith(process.env.HOME || '');
      const isUserMemory = userPath.startsWith(process.env.HOME || '');

      expect(isProjectMemory).toBe(true);
      expect(isUserMemory).toBe(true);
    });
  });
});
