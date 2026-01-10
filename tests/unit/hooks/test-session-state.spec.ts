/**
 * T102: Unit test for session deduplication state
 *
 * Tests the session state manager that tracks which
 * memories have been shown to avoid duplicate warnings.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SessionState,
  createSessionState,
  hasBeenShown,
  markAsShown,
  clearShownMemories,
  getShownCount,
  getSessionDuration,
  isSessionExpired,
  pruneExpiredEntries,
} from '../../../hooks/lib/session-state.js';

describe('Session State', () => {
  describe('createSessionState', () => {
    it('should create empty session state', () => {
      const state = createSessionState();

      expect(state.shownMemories).toBeInstanceOf(Set);
      expect(state.shownMemories.size).toBe(0);
      expect(state.startTime).toBeDefined();
    });

    it('should set session start time', () => {
      const before = Date.now();
      const state = createSessionState();
      const after = Date.now();

      expect(state.startTime).toBeGreaterThanOrEqual(before);
      expect(state.startTime).toBeLessThanOrEqual(after);
    });

    it('should accept custom start time', () => {
      const customTime = Date.now() - 60000;
      const state = createSessionState(customTime);

      expect(state.startTime).toBe(customTime);
    });
  });

  describe('hasBeenShown', () => {
    it('should return false for new memory', () => {
      const state = createSessionState();

      expect(hasBeenShown(state, 'memory-123')).toBe(false);
    });

    it('should return true for previously shown memory', () => {
      const state = createSessionState();
      markAsShown(state, 'memory-123');

      expect(hasBeenShown(state, 'memory-123')).toBe(true);
    });

    it('should handle multiple memories', () => {
      const state = createSessionState();
      markAsShown(state, 'memory-1');
      markAsShown(state, 'memory-2');

      expect(hasBeenShown(state, 'memory-1')).toBe(true);
      expect(hasBeenShown(state, 'memory-2')).toBe(true);
      expect(hasBeenShown(state, 'memory-3')).toBe(false);
    });
  });

  describe('markAsShown', () => {
    it('should add memory to shown set', () => {
      const state = createSessionState();
      markAsShown(state, 'memory-123');

      expect(state.shownMemories.has('memory-123')).toBe(true);
    });

    it('should be idempotent', () => {
      const state = createSessionState();
      markAsShown(state, 'memory-123');
      markAsShown(state, 'memory-123');
      markAsShown(state, 'memory-123');

      expect(state.shownMemories.size).toBe(1);
    });

    it('should record timestamp', () => {
      const state = createSessionState();
      const before = Date.now();
      markAsShown(state, 'memory-123');
      const after = Date.now();

      const entry = state.shownTimestamps?.get('memory-123');
      expect(entry).toBeGreaterThanOrEqual(before);
      expect(entry).toBeLessThanOrEqual(after);
    });
  });

  describe('clearShownMemories', () => {
    it('should clear all shown memories', () => {
      const state = createSessionState();
      markAsShown(state, 'memory-1');
      markAsShown(state, 'memory-2');
      markAsShown(state, 'memory-3');

      clearShownMemories(state);

      expect(state.shownMemories.size).toBe(0);
    });

    it('should preserve session start time', () => {
      const state = createSessionState();
      const originalStartTime = state.startTime;
      markAsShown(state, 'memory-1');

      clearShownMemories(state);

      expect(state.startTime).toBe(originalStartTime);
    });
  });

  describe('getShownCount', () => {
    it('should return 0 for empty state', () => {
      const state = createSessionState();
      expect(getShownCount(state)).toBe(0);
    });

    it('should return correct count', () => {
      const state = createSessionState();
      markAsShown(state, 'memory-1');
      markAsShown(state, 'memory-2');
      markAsShown(state, 'memory-3');

      expect(getShownCount(state)).toBe(3);
    });
  });

  describe('getSessionDuration', () => {
    it('should return duration in milliseconds', async () => {
      const state = createSessionState(Date.now() - 5000);

      const duration = getSessionDuration(state);
      expect(duration).toBeGreaterThanOrEqual(5000);
      expect(duration).toBeLessThan(6000);
    });
  });

  describe('isSessionExpired', () => {
    it('should return false for recent session', () => {
      const state = createSessionState();
      expect(isSessionExpired(state, 3600000)).toBe(false);
    });

    it('should return true for expired session', () => {
      const state = createSessionState(Date.now() - 7200000); // 2 hours ago
      expect(isSessionExpired(state, 3600000)).toBe(true); // 1 hour timeout
    });

    it('should use default timeout of 1 hour', () => {
      const state = createSessionState(Date.now() - 3700000); // 1 hour + a bit
      expect(isSessionExpired(state)).toBe(true);
    });
  });

  describe('pruneExpiredEntries', () => {
    it('should remove entries older than max age', () => {
      const state = createSessionState();
      state.shownTimestamps = new Map();

      // Add old entry
      state.shownMemories.add('old-memory');
      state.shownTimestamps.set('old-memory', Date.now() - 3700000);

      // Add recent entry
      state.shownMemories.add('new-memory');
      state.shownTimestamps.set('new-memory', Date.now());

      pruneExpiredEntries(state, 3600000);

      expect(state.shownMemories.has('old-memory')).toBe(false);
      expect(state.shownMemories.has('new-memory')).toBe(true);
    });

    it('should handle state without timestamps', () => {
      const state = createSessionState();
      state.shownMemories.add('memory-1');

      // Should not throw
      expect(() => pruneExpiredEntries(state)).not.toThrow();
    });
  });
});
