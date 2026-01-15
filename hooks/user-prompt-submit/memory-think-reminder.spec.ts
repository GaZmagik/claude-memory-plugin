#!/usr/bin/env bun
/**
 * Tests for memory-think-reminder hook
 *
 * Verifies the hook returns the expected reminder text for memory think usage.
 */

import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { spawn } from '../src/core/subprocess.ts';

const HOOK_PATH = join(import.meta.dir, 'memory-think-reminder.ts');

describe('memory-think-reminder hook', () => {
  describe('output content', () => {
    it('should return reminder text containing memory think commands', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'UserPromptSubmit',
          prompt: 'test prompt',
          session_id: 'test-session',
          cwd: process.cwd(),
        }),
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('memory think');
      expect(result.stdout).toContain('memory think create');
      expect(result.stdout).toContain('memory think add');
      expect(result.stdout).toContain('memory think conclude');
    });

    it('should mention promotion types', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'UserPromptSubmit',
          prompt: 'test',
          session_id: 'test',
          cwd: process.cwd(),
        }),
        timeout: 5000,
      });

      expect(result.stdout).toContain('decision');
      expect(result.stdout).toContain('learning');
      expect(result.stdout).toContain('gotcha');
      expect(result.stdout).toContain('artifact');
    });
  });

  describe('exit behaviour', () => {
    it('should exit with code 0 (allow)', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'UserPromptSubmit',
          prompt: 'test',
          session_id: 'test',
          cwd: process.cwd(),
        }),
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
    });
  });
});
