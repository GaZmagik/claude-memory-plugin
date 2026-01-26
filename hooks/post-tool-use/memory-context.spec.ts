#!/usr/bin/env bun
/**
 * Tests for memory-context PostToolUse hook
 *
 * This hook provides context-aware memory suggestions:
 * - READ mode: Injects gotchas when reading files
 * - WRITE mode: Suggests memory capture after significant changes
 *
 * Note: Full integration tests require Ollama running. These tests
 * focus on basic execution and input handling.
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { join } from 'path';
import { existsSync } from 'fs';
import { spawn } from '../src/core/subprocess.ts';

const HOOK_PATH = join(import.meta.dir, 'memory-context.ts');

// Check if Ollama is available for integration tests
let _ollamaAvailable = false;
beforeAll(async () => {
  try {
    const result = await spawn(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', 'http://localhost:11434/api/tags'], {
      timeout: 2000,
    });
    _ollamaAvailable = result.stdout.trim() === '200';
  } catch {
    _ollamaAvailable = false;
  }
  // Suppress unused variable warning - reserved for future skipIf() integration tests
  void _ollamaAvailable;
});

describe('memory-context hook', () => {
  describe('basic execution', () => {
    it('should exit with code 0 for non-PostToolUse events', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PreToolUse',
          tool_name: 'Read',
          session_id: 'test-session',
          cwd: process.cwd(),
        }),
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should exit with code 0 for PostToolUse with disabled tool', async () => {
      // LSP tool is explicitly disabled in the config
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PostToolUse',
          tool_name: 'LSP',
          session_id: 'test-session',
          cwd: process.cwd(),
        }),
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should handle missing input gracefully', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: '{}',
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should handle malformed JSON gracefully', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: 'not json',
        timeout: 5000,
      });

      // Hook should handle parse errors gracefully
      expect(result.exitCode).toBe(0);
    });
  });

  describe('READ mode (enabled tool)', () => {
    it('should process Read tool events without error', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PostToolUse',
          tool_name: 'Read',
          tool_input: {
            file_path: '/tmp/test-file.ts',
          },
          session_id: 'test-session',
          cwd: process.cwd(),
        }),
        timeout: 10000, // Hook timeout is 2s, add buffer for bun startup
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    }, 15000); // Test timeout must exceed spawn timeout

    it('should skip non-code files', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PostToolUse',
          tool_name: 'Read',
          tool_input: {
            file_path: '/tmp/image.png',
          },
          session_id: 'test-session',
          cwd: process.cwd(),
        }),
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      // Non-code files should return quickly without Ollama call
    });

    it('should handle missing file_path in tool_input', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PostToolUse',
          tool_name: 'Read',
          tool_input: {},
          session_id: 'test-session',
          cwd: process.cwd(),
        }),
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('WRITE mode (Edit/Write tools)', () => {
    it('should process Write tool events without error', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PostToolUse',
          tool_name: 'Write',
          tool_input: {
            file_path: '/tmp/test-output.ts',
            content: 'test content',
          },
          session_id: 'test-session',
          cwd: process.cwd(),
        }),
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    }, 15000);

    it('should process Edit tool events without error', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PostToolUse',
          tool_name: 'Edit',
          tool_input: {
            file_path: '/tmp/test-edit.ts',
            old_string: 'old',
            new_string: 'new',
          },
          session_id: 'test-session',
          cwd: process.cwd(),
        }),
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    }, 15000);

    it('should process MultiEdit tool events without error', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PostToolUse',
          tool_name: 'MultiEdit',
          tool_input: {
            file_path: '/tmp/test-multiedit.ts',
            edits: [],
          },
          session_id: 'test-session',
          cwd: process.cwd(),
        }),
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    }, 15000);
  });

  describe('config loading', () => {
    it('should use default config when config file missing', async () => {
      // Run in /tmp where no config exists
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PostToolUse',
          tool_name: 'Read',
          tool_input: {
            file_path: '/tmp/test.ts',
          },
          session_id: 'test-session',
          cwd: '/tmp',
        }),
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    }, 15000);
  });

  describe('logging behaviour', () => {
    it('should create log directory in project with .claude folder', async () => {
      // Use the actual project dir which has .claude
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PostToolUse',
          tool_name: 'Read',
          tool_input: {
            file_path: join(process.cwd(), 'hooks', 'post-tool-use', 'memory-context.ts'),
          },
          session_id: 'test-session-logging',
          cwd: process.cwd(),
        }),
        timeout: 10000,
      });

      expect(result.success).toBe(true);

      // Check that logs dir exists (may have been created by hook)
      const logsDir = join(process.cwd(), '.claude', 'logs');
      expect(existsSync(logsDir)).toBe(true);
    }, 15000);
  });

  describe('code file extensions', () => {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.sh', '.md', '.json', '.toml', '.yaml', '.yml'];
    const nonCodeExtensions = ['.png', '.jpg', '.pdf', '.exe', '.bin', '.zip'];

    for (const ext of codeExtensions) {
      it(`should process ${ext} files`, async () => {
        const result = await spawn(['bun', HOOK_PATH], {
          stdin: JSON.stringify({
            hook_event_name: 'PostToolUse',
            tool_name: 'Read',
            tool_input: {
              file_path: `/tmp/test${ext}`,
            },
            session_id: `test-ext-${ext}`,
            cwd: process.cwd(),
          }),
          timeout: 10000,
        });

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
      }, 15000);
    }

    for (const ext of nonCodeExtensions) {
      it(`should skip ${ext} files quickly`, async () => {
        const startTime = Date.now();
        const result = await spawn(['bun', HOOK_PATH], {
          stdin: JSON.stringify({
            hook_event_name: 'PostToolUse',
            tool_name: 'Read',
            tool_input: {
              file_path: `/tmp/test${ext}`,
            },
            session_id: `test-skip-${ext}`,
            cwd: process.cwd(),
          }),
          timeout: 5000,
        });
        const elapsed = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        // Non-code files should skip quickly without Ollama call
        expect(elapsed).toBeLessThan(3000);
      });
    }
  });

  describe('hook output structure', () => {
    it('should return valid hookSpecificOutput when providing context', async () => {
      // This test may or may not produce output depending on Ollama and memory state
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'PostToolUse',
          tool_name: 'Read',
          tool_input: {
            file_path: join(process.cwd(), 'hooks', 'src', 'core', 'error-handler.ts'),
          },
          session_id: 'test-output-structure',
          cwd: process.cwd(),
        }),
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);

      // If there's output, verify structure
      if (result.stdout.trim()) {
        // Output should either be empty or contain hookSpecificOutput
        const hasValidStructure =
          result.stdout.trim() === '' ||
          result.stdout.includes('hookSpecificOutput') ||
          result.stdout.includes('GOTCHAS') ||
          result.stdout.includes('SYSTEM NOTICE');
        expect(hasValidStructure).toBe(true);
      }
    }, 15000);
  });
});
