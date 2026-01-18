/**
 * Tests for cross-platform subprocess utilities
 */

import { describe, it, expect } from 'vitest';
import { spawnSync, spawn, execOrThrow } from './subprocess.ts';

describe('subprocess', () => {
  describe('spawnSync', () => {
    it('should execute a simple command successfully', async () => {
      const result = await spawnSync(['echo', 'hello']);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('hello');
      expect(result.timedOut).toBe(false);
    });

    it('should capture stderr', async () => {
      const result = await spawnSync(['ls', '/nonexistent-path-12345']);
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('No such file');
    });

    it('should respect timeout', async () => {
      const result = await spawnSync(['sleep', '10'], { timeout: 100 });
      expect(result.timedOut).toBe(true);
      expect(result.success).toBe(false);
    });

    it('should pass environment variables', async () => {
      const result = await spawnSync(['printenv', 'TEST_VAR'], {
        env: { TEST_VAR: 'test_value' },
      });
      expect(result.stdout.trim()).toBe('test_value');
    });
  });

  describe('spawn', () => {
    it('should execute a simple command asynchronously', async () => {
      const result = await spawn(['echo', 'async hello']);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('async hello');
    });

    it('should handle stdin', async () => {
      const result = await spawn(['cat'], { stdin: 'piped input' });
      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe('piped input');
    });

    it('should respect timeout for async spawn', async () => {
      const result = await spawn(['sleep', '10'], { timeout: 100 });
      expect(result.timedOut).toBe(true);
      expect(result.success).toBe(false);
    });
  });

  describe('execOrThrow', () => {
    it('should return result on success', async () => {
      const result = await execOrThrow(['echo', 'success']);
      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe('success');
    });

    it('should throw on command failure', async () => {
      await expect(execOrThrow(['false'])).rejects.toThrow('Command failed');
    });

    it('should throw on timeout', async () => {
      await expect(execOrThrow(['sleep', '10'], { timeout: 100 })).rejects.toThrow(
        'Command timed out'
      );
    });
  });

  describe('spawnSync error handling', () => {
    it('should handle non-existent command gracefully', async () => {
      const result = await spawnSync(['nonexistent-command-xyz-12345']);

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(false);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle stdin input', async () => {
      const result = await spawnSync(['cat'], { stdin: 'hello from stdin' });

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe('hello from stdin');
    });
  });

  describe('spawn error handling', () => {
    it('should handle non-existent command in async spawn', async () => {
      const result = await spawn(['nonexistent-command-abc-67890']);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBeNull();
      // Error message varies by runtime (ENOENT or "not found")
      expect(result.stderr.toLowerCase()).toMatch(/enoent|not found|executable/i);
    });

    it('should capture stderr in async spawn', async () => {
      const result = await spawn(['ls', '/path-that-does-not-exist-xyz']);

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('No such file');
    });

    it('should pass environment variables in async spawn', async () => {
      const result = await spawn(['printenv', 'ASYNC_TEST_VAR'], {
        env: { ASYNC_TEST_VAR: 'async_value' },
      });

      expect(result.stdout.trim()).toBe('async_value');
    });

    it('should respect cwd option', async () => {
      const result = await spawn(['pwd'], { cwd: '/tmp' });

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe('/tmp');
    });
  });

  describe('spawnSync with cwd', () => {
    it('should respect cwd option', async () => {
      const result = await spawnSync(['pwd'], { cwd: '/tmp' });

      expect(result.success).toBe(true);
      expect(result.stdout.trim()).toBe('/tmp');
    });
  });

  describe('output truncation at MAX_OUTPUT_BYTES boundary', () => {
    // MAX_OUTPUT_BYTES is 10MB (10 * 1024 * 1024 = 10485760 bytes)
    const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;

    it('should truncate stdout exceeding 10MB limit', async () => {
      // Generate 11MB of output (slightly over limit)
      // Using dd is faster than yes for large output
      const result = await spawn(
        ['sh', '-c', 'dd if=/dev/zero bs=1M count=11 2>/dev/null | tr "\\0" "a"'],
        { timeout: 30000 }
      );

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('... [output truncated at 10MB limit]');
      // Should be capped at ~10MB + truncation notice
      expect(result.stdout.length).toBeLessThanOrEqual(MAX_OUTPUT_BYTES + 100);
    }, 60000); // 60s timeout for slow CI

    it('should truncate stderr exceeding 10MB limit', async () => {
      // Redirect large output to stderr
      const result = await spawn(
        ['sh', '-c', 'dd if=/dev/zero bs=1M count=11 2>/dev/null | tr "\\0" "a" >&2'],
        { timeout: 30000 }
      );

      expect(result.success).toBe(true);
      expect(result.stderr).toContain('... [output truncated at 10MB limit]');
      expect(result.stderr.length).toBeLessThanOrEqual(MAX_OUTPUT_BYTES + 100);
    }, 60000);

    it('should not truncate output under 10MB limit', async () => {
      // Generate 1MB of output (well under limit)
      const result = await spawn(
        ['sh', '-c', 'dd if=/dev/zero bs=1M count=1 2>/dev/null | tr "\\0" "b"'],
        { timeout: 10000 }
      );

      expect(result.success).toBe(true);
      expect(result.stdout).not.toContain('... [output truncated');
      expect(result.stdout.length).toBe(1024 * 1024); // Exactly 1MB
    }, 30000);
  });
});
