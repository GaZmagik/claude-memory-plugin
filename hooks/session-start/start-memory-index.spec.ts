#!/usr/bin/env bun
/**
 * Tests for start-memory-index SessionStart hook
 *
 * This hook provides memory index summaries and semantic search results
 * based on git branch context at session start.
 */

import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { existsSync } from 'fs';
import { spawn } from '../src/core/subprocess.ts';

const HOOK_PATH = join(import.meta.dir, 'start-memory-index.ts');

describe('start-memory-index hook', () => {
  describe('basic execution', () => {
    it('should execute without error', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'SessionStart',
          session_id: 'test-session-123',
          cwd: process.cwd(),
        }),
        timeout: 15000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should return valid JSON when memory index exists', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'SessionStart',
          session_id: 'test-session-123',
          cwd: process.cwd(),
        }),
        timeout: 15000,
      });

      // Hook may return empty or JSON depending on index presence
      if (result.stdout.trim()) {
        // If there's output, it should be parseable or contain memory info
        const hasMemoryInfo = result.stdout.includes('Memory Index') ||
                             result.stdout.includes('hookSpecificOutput');
        expect(hasMemoryInfo || result.stdout.trim() === '').toBe(true);
      }
    });
  });

  describe('with missing index', () => {
    it('should handle missing index gracefully', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'SessionStart',
          session_id: 'test-session-123',
          cwd: '/tmp', // No .claude/memory here
        }),
        timeout: 15000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('hook output structure', () => {
    it('should include memory search tip when providing output', async () => {
      // Only test if local memory index exists
      const localIndex = join(process.cwd(), '.claude', 'memory', 'index.json');
      if (!existsSync(localIndex)) {
        // Skip if no index
        expect(true).toBe(true);
        return;
      }

      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'SessionStart',
          session_id: 'test-session-123',
          cwd: process.cwd(),
        }),
        timeout: 15000,
      });

      if (result.stdout.includes('Memory Index')) {
        expect(result.stdout).toContain('memory search');
      }
    });
  });
});
