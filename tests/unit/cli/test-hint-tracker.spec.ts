/**
 * T007: Unit test for HintState session storage
 *
 * Tests the HintTracker class that manages hint display state
 * across a session with persistence and TTL support.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

// These imports will fail until implementation exists (TDD Red phase)
import {
  HintTracker,
  type HintState,
  type HintTrackerOptions,
} from '../../../skills/memory/src/cli/hint-tracker.js';

describe('HintTracker', () => {
  let testDir: string;
  let cacheDir: string;
  const testSessionId = 'test-session-12345';

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'hint-tracker-'));
    cacheDir = path.join(testDir, '.claude', 'cache', 'hints');
    fs.mkdirSync(cacheDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('HintState interface', () => {
    it('should define required fields for hint tracking', () => {
      // HintState should have: sessionId, counts (per command), lastShown
      const state: HintState = {
        sessionId: testSessionId,
        counts: {
          'think:create': 2,
          'think:add': 1,
        },
        lastShown: Date.now(),
      };

      expect(state.sessionId).toBe(testSessionId);
      expect(state.counts['think:create']).toBe(2);
      expect(state.counts['think:add']).toBe(1);
      expect(typeof state.lastShown).toBe('number');
    });
  });

  describe('create()', () => {
    it('should create a new HintTracker instance via async factory', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);

      expect(tracker).toBeInstanceOf(HintTracker);
    });

    it('should create cache directory if it does not exist', async () => {
      const newCacheDir = path.join(testDir, 'new', 'cache', 'dir');
      expect(fs.existsSync(newCacheDir)).toBe(false);

      await HintTracker.create(newCacheDir, testSessionId);

      expect(fs.existsSync(newCacheDir)).toBe(true);
    });

    it('should load existing state from disk if session matches', async () => {
      // Pre-populate state file
      const stateFile = path.join(cacheDir, `hint-state-${testSessionId}.json`);
      const existingState: HintState = {
        sessionId: testSessionId,
        counts: { 'think:create': 2 },
        lastShown: Date.now() - 1000,
      };
      fs.writeFileSync(stateFile, JSON.stringify(existingState));

      const tracker = await HintTracker.create(cacheDir, testSessionId);

      expect(tracker.getCount('think:create')).toBe(2);
    });

    it('should ignore state file if session ID does not match', async () => {
      // Pre-populate state file with different session
      const stateFile = path.join(cacheDir, `hint-state-${testSessionId}.json`);
      const oldState: HintState = {
        sessionId: 'different-session',
        counts: { 'think:create': 5 },
        lastShown: Date.now() - 1000,
      };
      fs.writeFileSync(stateFile, JSON.stringify(oldState));

      const tracker = await HintTracker.create(cacheDir, testSessionId);

      // Should start fresh since session doesn't match
      expect(tracker.getCount('think:create')).toBe(0);
    });

    it('should handle corrupted state file gracefully', async () => {
      const stateFile = path.join(cacheDir, `hint-state-${testSessionId}.json`);
      fs.writeFileSync(stateFile, 'not valid json {{{');

      // Should not throw, should start fresh
      const tracker = await HintTracker.create(cacheDir, testSessionId);

      expect(tracker.getCount('think:create')).toBe(0);
    });
  });

  describe('getCount()', () => {
    it('should return 0 for commands that have not been tracked', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);

      expect(tracker.getCount('think:create')).toBe(0);
      expect(tracker.getCount('think:add')).toBe(0);
      expect(tracker.getCount('nonexistent:command')).toBe(0);
    });

    it('should return correct count after increment', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);

      await tracker.increment('think:create');
      expect(tracker.getCount('think:create')).toBe(1);

      await tracker.increment('think:create');
      expect(tracker.getCount('think:create')).toBe(2);
    });
  });

  describe('increment()', () => {
    it('should increment count for a specific command', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);

      await tracker.increment('think:add');

      expect(tracker.getCount('think:add')).toBe(1);
    });

    it('should track counts independently per command', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);

      await tracker.increment('think:create');
      await tracker.increment('think:create');
      await tracker.increment('think:add');

      expect(tracker.getCount('think:create')).toBe(2);
      expect(tracker.getCount('think:add')).toBe(1);
    });

    it('should persist state to disk after increment', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);
      const stateFile = path.join(cacheDir, `hint-state-${testSessionId}.json`);

      await tracker.increment('think:create');

      // Verify file was written
      expect(fs.existsSync(stateFile)).toBe(true);

      // Verify content
      const content = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      expect(content.counts['think:create']).toBe(1);
    });

    it('should update lastShown timestamp on increment', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);
      const stateFile = path.join(cacheDir, `hint-state-${testSessionId}.json`);

      const beforeTime = Date.now();
      await tracker.increment('think:create');
      const afterTime = Date.now();

      const content = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      expect(content.lastShown).toBeGreaterThanOrEqual(beforeTime);
      expect(content.lastShown).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('session isolation', () => {
    it('should isolate state between different session IDs', async () => {
      const tracker1 = await HintTracker.create(cacheDir, 'session-a');
      const tracker2 = await HintTracker.create(cacheDir, 'session-b');

      await tracker1.increment('think:create');
      await tracker1.increment('think:create');

      // Session B should have its own count
      expect(tracker2.getCount('think:create')).toBe(0);
    });

    it('should reset counts when session changes', async () => {
      // First session
      const tracker1 = await HintTracker.create(cacheDir, 'session-old');
      await tracker1.increment('think:create');
      await tracker1.increment('think:create');
      await tracker1.increment('think:create');

      // New session - should start fresh
      const tracker2 = await HintTracker.create(cacheDir, 'session-new');
      expect(tracker2.getCount('think:create')).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should reset all counts to zero', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);

      await tracker.increment('think:create');
      await tracker.increment('think:add');
      await tracker.clear();

      expect(tracker.getCount('think:create')).toBe(0);
      expect(tracker.getCount('think:add')).toBe(0);
    });

    it('should persist cleared state to disk', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);
      const stateFile = path.join(cacheDir, `hint-state-${testSessionId}.json`);

      await tracker.increment('think:create');
      await tracker.clear();

      const content = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      expect(Object.keys(content.counts).length).toBe(0);
    });
  });

  describe('getTotalCount()', () => {
    it('should return sum of all command counts', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);

      await tracker.increment('think:create');
      await tracker.increment('think:add');
      await tracker.increment('think:add');

      expect(tracker.getTotalCount()).toBe(3);
    });

    it('should return 0 when no commands have been tracked', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);

      expect(tracker.getTotalCount()).toBe(0);
    });
  });

  describe('options', () => {
    it('should accept custom TTL option', async () => {
      const options: HintTrackerOptions = {
        ttlMs: 5000, // 5 seconds
      };

      const tracker = await HintTracker.create(cacheDir, testSessionId, options);

      // Should create successfully with custom TTL
      expect(tracker).toBeInstanceOf(HintTracker);
    });
  });
});
