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

    it('should return JSON with hookSpecificOutput when memory index exists', async () => {
      const localIndex = join(process.cwd(), '.claude', 'memory', 'index.json');
      if (!existsSync(localIndex)) {
        // Skip if no index - test requires memory index to exist
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

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).not.toBe('');

      // Parse JSON output and validate structure
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('hookSpecificOutput');
      expect(output.hookSpecificOutput).toHaveProperty('additionalContext');
      expect(output.hookSpecificOutput.additionalContext).toContain('Memory Index Available');
    });

    it('should include memory counts in summary when index exists', async () => {
      const localIndex = join(process.cwd(), '.claude', 'memory', 'index.json');
      if (!existsSync(localIndex)) {
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

      // Parse JSON and get the additionalContext
      const output = JSON.parse(result.stdout);
      const context = output.hookSpecificOutput.additionalContext;

      // Should contain memory type counts
      expect(context).toMatch(/Decisions: \d+/);
      expect(context).toMatch(/Learnings: \d+/);
      expect(context).toMatch(/Artifacts: \d+/);
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

  describe('automatic maintenance', () => {
    it('should not fail when memory CLI is unavailable', async () => {
      // Run in /tmp where memory CLI may not be installed/linked
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'SessionStart',
          session_id: 'test-maintenance',
          cwd: '/tmp',
        }),
        timeout: 20000,
      });

      // Should succeed even if health check/prune fail
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should run health check without blocking on errors', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'SessionStart',
          session_id: 'test-health-check',
          cwd: process.cwd(),
        }),
        timeout: 25000,
      });

      // Hook should complete regardless of health check result
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should run auto-prune silently', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'SessionStart',
          session_id: 'test-auto-prune',
          cwd: process.cwd(),
        }),
        timeout: 25000,
      });

      // Prune should not add output to stdout (logs only)
      expect(result.success).toBe(true);
      // If output exists, it should not mention "pruned" explicitly
      // (prune results go to log file, not agent output)
      if (result.stdout.includes('pruned')) {
        // This would indicate prune output leaked to agent - unexpected but not fatal
        expect(result.stdout).not.toContain('expired temporary');
      }
    });
  });

  describe('error resilience', () => {
    it('should handle malformed JSON input gracefully', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: '{"unclosed": ',
        timeout: 5000,
      });

      // Should not crash or hang
      expect(result.timedOut).toBe(false);
      // Hook should allow by default on parse error
      expect(result.exitCode).toBe(0);
    });

    it('should handle empty stdin gracefully', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: '',
        timeout: 5000,
      });

      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);
    });

    it('should handle missing session_id gracefully', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'SessionStart',
          cwd: process.cwd(),
        }),
        timeout: 15000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should handle missing cwd gracefully', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'SessionStart',
          session_id: 'test-no-cwd',
        }),
        timeout: 15000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should handle invalid cwd path gracefully', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'SessionStart',
          session_id: 'test-bad-cwd',
          cwd: '/nonexistent/path/that/does/not/exist',
        }),
        timeout: 15000,
      });

      // Should still succeed - hook should handle missing directories
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should handle extra/unexpected fields gracefully', async () => {
      const result = await spawn(['bun', HOOK_PATH], {
        stdin: JSON.stringify({
          hook_event_name: 'SessionStart',
          session_id: 'test-extra-fields',
          cwd: process.cwd(),
          unexpected_field: 'should be ignored',
          another_field: { nested: true },
        }),
        timeout: 15000,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });
  });
});
