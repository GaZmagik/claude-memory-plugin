#!/usr/bin/env bun
/**
 * Tests for protect-memory-directory hook
 *
 * Validates that Write/Edit/MultiEdit tools are blocked on .claude/memory/ paths.
 * Includes both unit tests for path detection and E2E tests that spawn the actual hook.
 */

import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { spawn } from '../src/core/subprocess.ts';

const HOOK_PATH = join(import.meta.dir, 'protect-memory-directory.ts');

/**
 * Unit test helper - mirrors the hook's path detection logic
 */
function isMemoryPath(filePath: string, home: string): { isMemory: boolean; memoryType: string } {
  const expandedPath = filePath.replace(/^~/, home);
  if (expandedPath.startsWith(`${home}/.claude/memory/`)) {
    return { isMemory: true, memoryType: 'user/global' };
  }
  if (expandedPath.includes('/.claude/memory/')) {
    return { isMemory: true, memoryType: 'project' };
  }
  return { isMemory: false, memoryType: '' };
}

describe('protect-memory-directory hook', () => {
  describe('path detection (unit)', () => {
    const home = '/home/user';

    describe('detects memory paths', () => {
      it('detects global memory path with ~', () => {
        const result = isMemoryPath('~/.claude/memory/permanent/foo.md', home);
        expect(result.isMemory).toBe(true);
        expect(result.memoryType).toBe('user/global');
      });

      it('detects global memory path with absolute', () => {
        const result = isMemoryPath('/home/user/.claude/memory/index.json', home);
        expect(result.isMemory).toBe(true);
        expect(result.memoryType).toBe('user/global');
      });

      it('detects project memory path', () => {
        const result = isMemoryPath('/projects/myapp/.claude/memory/graph.json', home);
        expect(result.isMemory).toBe(true);
        expect(result.memoryType).toBe('project');
      });
    });

    describe('rejects non-memory paths', () => {
      it('rejects .claude without memory', () => {
        const result = isMemoryPath('/home/user/.claude/config.json', home);
        expect(result.isMemory).toBe(false);
      });

      it('rejects memory without .claude', () => {
        const result = isMemoryPath('/tmp/memory/file.md', home);
        expect(result.isMemory).toBe(false);
      });

      it('rejects unrelated paths', () => {
        const result = isMemoryPath('/home/user/projects/src/index.ts', home);
        expect(result.isMemory).toBe(false);
      });
    });
  });

  describe('E2E hook execution', () => {
    it('should execute without error for non-memory paths', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PreToolUse',
          tool_name: 'Write',
          tool_input: {
            file_path: '/tmp/safe-file.txt',
            content: 'test content',
          },
        }),
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should block Write tool to project .claude/memory/', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PreToolUse',
          tool_name: 'Write',
          tool_input: {
            file_path: '/tmp/project/.claude/memory/test.md',
            content: 'malicious content',
          },
        }),
        timeout: 5000,
      });

      expect(result.exitCode).toBe(2); // BLOCK exit code
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('DIRECT MEMORY WRITE BLOCKED');
      expect(result.stderr).toContain('project');
    });

    it('should block Write tool to global ~/.claude/memory/', async () => {
      const home = process.env.HOME || '/home/test';
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PreToolUse',
          tool_name: 'Write',
          tool_input: {
            file_path: `${home}/.claude/memory/permanent/hack.md`,
            content: 'bypass attempt',
          },
        }),
        timeout: 5000,
      });

      expect(result.exitCode).toBe(2);
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('DIRECT MEMORY WRITE BLOCKED');
      expect(result.stderr).toContain('user/global');
    });

    it('should block Edit tool to .claude/memory/', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PreToolUse',
          tool_name: 'Edit',
          tool_input: {
            file_path: '/project/.claude/memory/graph.json',
            old_string: '"edges": []',
            new_string: '"edges": [{"malicious": true}]',
          },
        }),
        timeout: 5000,
      });

      expect(result.exitCode).toBe(2);
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('DIRECT MEMORY WRITE BLOCKED');
    });

    it('should block MultiEdit tool to .claude/memory/', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PreToolUse',
          tool_name: 'MultiEdit',
          tool_input: {
            file_path: '/project/.claude/memory/index.json',
            edits: [{ old_string: 'a', new_string: 'b' }],
          },
        }),
        timeout: 5000,
      });

      expect(result.exitCode).toBe(2);
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('DIRECT MEMORY WRITE BLOCKED');
    });

    it('should allow non-protected tools (Read) to memory paths', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PreToolUse',
          tool_name: 'Read',
          tool_input: {
            file_path: '/project/.claude/memory/permanent/decision.md',
          },
        }),
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should allow Bash tool (handled by separate hook)', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PreToolUse',
          tool_name: 'Bash',
          tool_input: {
            command: 'cat .claude/memory/index.json',
          },
        }),
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.success).toBe(true);
    });

    it('should handle missing tool_input gracefully', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PreToolUse',
          tool_name: 'Write',
          // No tool_input
        }),
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0); // Allow by default when no path
      expect(result.success).toBe(true);
    });

    it('should handle missing file_path gracefully', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PreToolUse',
          tool_name: 'Write',
          tool_input: {
            content: 'content without path',
          },
        }),
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0); // Allow by default when no path
      expect(result.success).toBe(true);
    });

    it('should handle malformed JSON gracefully', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: '{"unclosed": ',
        timeout: 5000,
      });

      // Should not crash - either allow or provide error
      expect(result.timedOut).toBe(false);
      // Exit code doesn't matter as long as it doesn't hang
    });

    it('should handle empty stdin gracefully', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: '',
        timeout: 5000,
      });

      expect(result.timedOut).toBe(false);
    });

    it('should block path with tilde expansion', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PreToolUse',
          tool_name: 'Write',
          tool_input: {
            file_path: '~/.claude/memory/permanent/test.md',
            content: 'tilde path test',
          },
        }),
        timeout: 5000,
      });

      expect(result.exitCode).toBe(2);
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('DIRECT MEMORY WRITE BLOCKED');
    });

    it('should provide helpful error message with CLI instructions', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PreToolUse',
          tool_name: 'Write',
          tool_input: {
            file_path: '/project/.claude/memory/test.md',
            content: 'test',
          },
        }),
        timeout: 5000,
      });

      expect(result.stderr).toContain('memory write');
      expect(result.stderr).toContain('memory read');
      expect(result.stderr).toContain('CORRECT APPROACH');
    });
  });
});
