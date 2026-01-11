/**
 * Tests for cross-platform subprocess utilities
 */

import { describe, it, expect } from 'vitest';
import { spawnSync, spawn, execOrThrow } from '../../../hooks/src/core/subprocess.ts';

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
});
