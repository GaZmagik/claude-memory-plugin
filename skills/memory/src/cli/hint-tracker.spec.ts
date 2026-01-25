/**
 * Unit tests for HintTracker
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { HintTracker, shouldShowHint, DEFAULT_HINT_THRESHOLD } from './hint-tracker.js';

describe('HintTracker', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'hint-tracker-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('getCount', () => {
    it('returns 0 for unknown commands', async () => {
      const tracker = await HintTracker.create(tempDir, 'test-session');
      expect(tracker.getCount('unknown')).toBe(0);
    });
  });

  describe('increment', () => {
    it('increments count for a command', async () => {
      const tracker = await HintTracker.create(tempDir, 'test-session');
      await tracker.increment('cmd');
      await tracker.increment('cmd');
      expect(tracker.getCount('cmd')).toBe(2);
    });
  });

  describe('clear', () => {
    it('clears all counts', async () => {
      const tracker = await HintTracker.create(tempDir, 'test-session');
      await tracker.increment('cmd-a');
      await tracker.clear();
      expect(tracker.getCount('cmd-a')).toBe(0);
    });
  });

  describe('getTotalCount', () => {
    it('returns sum of all counts', async () => {
      const tracker = await HintTracker.create(tempDir, 'test-session');
      await tracker.increment('cmd-a');
      await tracker.increment('cmd-b');
      expect(tracker.getTotalCount()).toBe(2);
    });
  });
});

describe('shouldShowHint', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'hint-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns true when count is below threshold', async () => {
    const tracker = await HintTracker.create(tempDir, 'test');
    expect(shouldShowHint(tracker, 'cmd')).toBe(true);
  });

  it('returns false when count reaches threshold', async () => {
    const tracker = await HintTracker.create(tempDir, 'test');
    for (let i = 0; i < DEFAULT_HINT_THRESHOLD; i++) {
      await tracker.increment('cmd');
    }
    expect(shouldShowHint(tracker, 'cmd')).toBe(false);
  });

  it('returns false when threshold is zero', async () => {
    const tracker = await HintTracker.create(tempDir, 'test');
    expect(shouldShowHint(tracker, 'cmd', { threshold: 0 })).toBe(false);
  });
});
