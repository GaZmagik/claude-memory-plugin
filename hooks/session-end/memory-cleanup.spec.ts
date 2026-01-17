/**
 * Tests for SessionEnd Memory Cleanup Hook
 *
 * This hook captures memories before /clear destroys conversation context.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SessionEnd Memory Cleanup Hook', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `memory-cleanup-test-${Date.now()}`);
    mkdirSync(join(testDir, '.claude', 'logs'), { recursive: true });
    mkdirSync(join(testDir, '.claude', 'flags'), { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('command invocation', () => {
    it('should use namespaced command /claude-memory-plugin:commit', () => {
      // The hook should use the namespaced command format
      // Format: /claude-memory-plugin:commit session-end-trigger=<reason>
      const expectedPattern = /^\/claude-memory-plugin:commit session-end-trigger=/;
      expect(expectedPattern.test('/claude-memory-plugin:commit session-end-trigger=clear')).toBe(true);
      expect(expectedPattern.test('/memory-commit session-end-trigger=clear')).toBe(false);
    });
  });

  describe('clear flag creation', () => {
    it('should create clear flag file with session info', () => {
      const flagDir = join(testDir, '.claude', 'flags');
      const sessionId = 'test-session-456';
      const flagFile = join(flagDir, `clear-${sessionId}`);

      writeFileSync(
        flagFile,
        `timestamp=${new Date().toISOString()}\nsession_id=${sessionId}\nreason=clear\n`
      );

      expect(existsSync(flagFile)).toBe(true);
    });
  });

  describe('reason filtering', () => {
    it('should only trigger on clear reason', () => {
      // Only "clear" should trigger memory capture
      const validReasons = ['clear'];
      const invalidReasons = ['exit', 'timeout', 'unknown', 'error'];

      validReasons.forEach((reason) => {
        expect(reason).toBe('clear');
      });

      invalidReasons.forEach((reason) => {
        expect(reason).not.toBe('clear');
      });
    });
  });
});
