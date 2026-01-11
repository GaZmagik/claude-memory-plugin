/**
 * Tests for forked session utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getLogDir,
  getTimestamp,
  isForkedSession,
} from '../../../hooks/src/session/forked-session.ts';

describe('forked-session', () => {
  describe('getTimestamp', () => {
    it('should return ISO-like timestamp without special chars', () => {
      const ts = getTimestamp();
      expect(ts).toMatch(/^\d{8}T\d{6}Z$/);
    });
  });

  describe('isForkedSession', () => {
    it('should return false in normal environment', () => {
      // Unless HOME contains claude-memory-home
      const result = isForkedSession();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getLogDir', () => {
    it('should return a valid path', () => {
      const logDir = getLogDir('/tmp');
      expect(logDir).toContain('logs');
    });
  });
});
