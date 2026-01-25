/**
 * T008: Unit test for progressive disclosure threshold logic
 *
 * Tests that hints appear for the first N uses (default: 3)
 * and then stop appearing (progressive disclosure).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

// These imports will fail until implementation exists (TDD Red phase)
import {
  shouldShowHint,
  type HintThresholdConfig,
  DEFAULT_HINT_THRESHOLD,
} from '../../../skills/memory/src/cli/hint-tracker.js';
import { HintTracker } from '../../../skills/memory/src/cli/hint-tracker.js';

describe('Progressive Disclosure Threshold', () => {
  let testDir: string;
  let cacheDir: string;
  const testSessionId = 'test-threshold-session';

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'hint-threshold-'));
    cacheDir = path.join(testDir, '.claude', 'cache', 'hints');
    fs.mkdirSync(cacheDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('DEFAULT_HINT_THRESHOLD', () => {
    it('should be 3 by default', () => {
      expect(DEFAULT_HINT_THRESHOLD).toBe(3);
    });
  });

  describe('shouldShowHint()', () => {
    it('should return true when count is 0 (first use)', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);

      const result = shouldShowHint(tracker, 'think:create');

      expect(result).toBe(true);
    });

    it('should return true when count is 1 (second use)', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);
      await tracker.increment('think:create');

      const result = shouldShowHint(tracker, 'think:create');

      expect(result).toBe(true);
    });

    it('should return true when count is 2 (third use)', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);
      await tracker.increment('think:create');
      await tracker.increment('think:create');

      const result = shouldShowHint(tracker, 'think:create');

      expect(result).toBe(true);
    });

    it('should return false when count reaches threshold (fourth use)', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);
      // Simulate 3 previous uses
      await tracker.increment('think:create');
      await tracker.increment('think:create');
      await tracker.increment('think:create');

      const result = shouldShowHint(tracker, 'think:create');

      expect(result).toBe(false);
    });

    it('should return false when count exceeds threshold', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);
      // Simulate 5 previous uses
      for (let i = 0; i < 5; i++) {
        await tracker.increment('think:create');
      }

      const result = shouldShowHint(tracker, 'think:create');

      expect(result).toBe(false);
    });

    it('should track threshold independently per command type', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);

      // Exhaust threshold for think:create
      await tracker.increment('think:create');
      await tracker.increment('think:create');
      await tracker.increment('think:create');

      // think:add should still show hints (count is 0)
      expect(shouldShowHint(tracker, 'think:create')).toBe(false);
      expect(shouldShowHint(tracker, 'think:add')).toBe(true);
    });
  });

  describe('shouldShowHint() with custom threshold', () => {
    it('should respect custom threshold of 1', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);
      const config: HintThresholdConfig = { threshold: 1 };

      // First use - should show
      expect(shouldShowHint(tracker, 'think:create', config)).toBe(true);

      // After one use - should not show
      await tracker.increment('think:create');
      expect(shouldShowHint(tracker, 'think:create', config)).toBe(false);
    });

    it('should respect custom threshold of 5', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);
      const config: HintThresholdConfig = { threshold: 5 };

      // Uses 1-5 should show
      for (let i = 0; i < 5; i++) {
        expect(shouldShowHint(tracker, 'think:create', config)).toBe(true);
        await tracker.increment('think:create');
      }

      // 6th use should not show
      expect(shouldShowHint(tracker, 'think:create', config)).toBe(false);
    });

    it('should handle threshold of 0 (never show hints)', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);
      const config: HintThresholdConfig = { threshold: 0 };

      // Even first use should not show
      expect(shouldShowHint(tracker, 'think:create', config)).toBe(false);
    });
  });

  describe('per-command threshold configuration', () => {
    it('should allow different thresholds per command type', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);

      // think:create gets 2 hints
      const createConfig: HintThresholdConfig = { threshold: 2 };
      // think:add gets 5 hints
      const addConfig: HintThresholdConfig = { threshold: 5 };

      // Simulate 2 uses of each
      await tracker.increment('think:create');
      await tracker.increment('think:create');
      await tracker.increment('think:add');
      await tracker.increment('think:add');

      // create should be exhausted, add should still show
      expect(shouldShowHint(tracker, 'think:create', createConfig)).toBe(false);
      expect(shouldShowHint(tracker, 'think:add', addConfig)).toBe(true);
    });
  });

  describe('session boundary behaviour', () => {
    it('should reset hint counts when session changes', async () => {
      // First session - exhaust threshold
      const tracker1 = await HintTracker.create(cacheDir, 'session-1');
      await tracker1.increment('think:create');
      await tracker1.increment('think:create');
      await tracker1.increment('think:create');
      expect(shouldShowHint(tracker1, 'think:create')).toBe(false);

      // New session - should show hints again
      const tracker2 = await HintTracker.create(cacheDir, 'session-2');
      expect(shouldShowHint(tracker2, 'think:create')).toBe(true);
    });

    it('should preserve hint counts within same session', async () => {
      // First instance
      const tracker1 = await HintTracker.create(cacheDir, testSessionId);
      await tracker1.increment('think:create');
      await tracker1.increment('think:create');

      // Second instance with same session - should load persisted counts
      const tracker2 = await HintTracker.create(cacheDir, testSessionId);
      expect(tracker2.getCount('think:create')).toBe(2);
      expect(shouldShowHint(tracker2, 'think:create')).toBe(true); // One more hint left

      await tracker2.increment('think:create');
      expect(shouldShowHint(tracker2, 'think:create')).toBe(false); // Now exhausted
    });
  });

  describe('edge cases', () => {
    it('should handle negative threshold gracefully (treat as 0)', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);
      const config: HintThresholdConfig = { threshold: -1 };

      // Should treat as "never show"
      expect(shouldShowHint(tracker, 'think:create', config)).toBe(false);
    });

    it('should handle very large threshold', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);
      const config: HintThresholdConfig = { threshold: 1000000 };

      // Should still work correctly
      expect(shouldShowHint(tracker, 'think:create', config)).toBe(true);
    });

    it('should handle empty command string', async () => {
      const tracker = await HintTracker.create(cacheDir, testSessionId);

      // Should not throw, should work like any other command
      expect(shouldShowHint(tracker, '')).toBe(true);
      await tracker.increment('');
      expect(tracker.getCount('')).toBe(1);
    });
  });
});
