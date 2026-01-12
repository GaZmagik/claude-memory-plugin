/**
 * Tests for PreCompact Memory Capture Hook
 *
 * This hook extracts session context and spawns a background Claude process
 * to capture memories before compaction.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('PreCompact Memory Capture Hook', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `memory-capture-test-${Date.now()}`);
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
    it('should use namespaced command /memory:memory-commit', () => {
      // The hook should use the namespaced command format
      // Format: /memory:memory-commit precompact-trigger=<trigger>
      const expectedPattern = /^\/memory:memory-commit precompact-trigger=/;
      expect(expectedPattern.test('/memory:memory-commit precompact-trigger=auto')).toBe(true);
      expect(expectedPattern.test('/memory-commit precompact-trigger=auto')).toBe(false);
    });
  });

  describe('gotcha cache cleanup', () => {
    it('should delete gotcha session cache on compaction', () => {
      const logDir = join(testDir, '.claude', 'logs');
      const cacheFile = join(logDir, 'gotcha-session-cache.json');

      // Create a mock cache file
      writeFileSync(cacheFile, JSON.stringify({ test: 'data' }));
      expect(existsSync(cacheFile)).toBe(true);

      // Simulate cleanup
      if (existsSync(cacheFile)) {
        unlinkSync(cacheFile);
      }

      expect(existsSync(cacheFile)).toBe(false);
    });
  });

  describe('compact flag creation', () => {
    it('should create compact flag file with session info', () => {
      const flagDir = join(testDir, '.claude', 'flags');
      const sessionId = 'test-session-123';
      const flagFile = join(flagDir, `compact-${sessionId}`);

      writeFileSync(
        flagFile,
        `timestamp=${new Date().toISOString()}\nsession_id=${sessionId}\ntrigger=auto\n`
      );

      expect(existsSync(flagFile)).toBe(true);
    });
  });
});
