/**
 * Tests for Think ID Generator
 */

import { describe, it, expect } from 'bun:test';
import { generateThinkId, isValidThinkId, parseThinkIdTimestamp } from './id-generator.js';

describe('think/id-generator', () => {
  describe('generateThinkId', () => {
    it('generates ID in correct format with milliseconds', () => {
      const id = generateThinkId();
      // Format: thought-YYYYMMDD-HHMMSSmmm (9 digits after second hyphen)
      expect(id).toMatch(/^thought-\d{8}-\d{9}$/);
    });

    it('starts with thought- prefix', () => {
      const id = generateThinkId();
      expect(id.startsWith('thought-')).toBe(true);
    });

    it('generates unique IDs when called with small delays', async () => {
      // Millisecond precision prevents same-second collisions
      const ids = new Set<string>();
      for (let i = 0; i < 5; i++) {
        ids.add(generateThinkId());
        await new Promise(r => setTimeout(r, 2)); // 2ms delay
      }
      // All should be unique due to millisecond precision
      expect(ids.size).toBe(5);
    });
  });

  describe('isValidThinkId', () => {
    it('returns true for valid IDs with thought- prefix (without millis)', () => {
      expect(isValidThinkId('thought-20260112-103000')).toBe(true);
      expect(isValidThinkId('thought-00000000-000000')).toBe(true);
      expect(isValidThinkId('thought-99999999-999999')).toBe(true);
    });

    it('returns true for valid IDs with thought- prefix (with millis)', () => {
      expect(isValidThinkId('thought-20260112-103000123')).toBe(true);
      expect(isValidThinkId('thought-00000000-000000000')).toBe(true);
      expect(isValidThinkId('thought-99999999-999999999')).toBe(true);
    });

    it('returns true for legacy think- prefix IDs (without millis)', () => {
      expect(isValidThinkId('think-20260112-103000')).toBe(true);
      expect(isValidThinkId('think-00000000-000000')).toBe(true);
      expect(isValidThinkId('think-99999999-999999')).toBe(true);
    });

    it('returns true for legacy think- prefix IDs (with millis)', () => {
      expect(isValidThinkId('think-20260112-103000123')).toBe(true);
      expect(isValidThinkId('think-00000000-000000000')).toBe(true);
      expect(isValidThinkId('think-99999999-999999999')).toBe(true);
    });

    it('returns false for invalid IDs', () => {
      expect(isValidThinkId('')).toBe(false);
      expect(isValidThinkId('thought')).toBe(false);
      expect(isValidThinkId('thought-')).toBe(false);
      expect(isValidThinkId('thought-12345678')).toBe(false);
      expect(isValidThinkId('thought-1234567-123456')).toBe(false);
      expect(isValidThinkId('thought-123456789-123456')).toBe(false);
      expect(isValidThinkId('thought-12345678-12345')).toBe(false); // 5 digits
      expect(isValidThinkId('thought-12345678-1234567890')).toBe(false); // 10 digits
      expect(isValidThinkId('decision-20260112-103000')).toBe(false);
      expect(isValidThinkId('THOUGHT-20260112-103000')).toBe(false);
    });

    it('validates generated IDs', () => {
      const id = generateThinkId();
      expect(isValidThinkId(id)).toBe(true);
    });
  });

  describe('parseThinkIdTimestamp', () => {
    it('parses valid thought ID to Date (without millis)', () => {
      const date = parseThinkIdTimestamp('thought-20260112-103045');
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(0); // January (0-indexed)
      expect(date?.getDate()).toBe(12);
      expect(date?.getHours()).toBe(10);
      expect(date?.getMinutes()).toBe(30);
      expect(date?.getSeconds()).toBe(45);
    });

    it('parses valid thought ID with milliseconds', () => {
      const date = parseThinkIdTimestamp('thought-20260112-103045678');
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(12);
      expect(date?.getHours()).toBe(10);
      expect(date?.getMinutes()).toBe(30);
      expect(date?.getSeconds()).toBe(45);
      expect(date?.getMilliseconds()).toBe(678);
    });

    it('parses legacy think- prefix IDs', () => {
      const date = parseThinkIdTimestamp('think-20260112-103045');
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(12);
    });

    it('returns null for invalid ID', () => {
      expect(parseThinkIdTimestamp('invalid')).toBeNull();
      expect(parseThinkIdTimestamp('')).toBeNull();
      expect(parseThinkIdTimestamp('decision-20260112-103000')).toBeNull();
    });

    it('round-trips generated ID', () => {
      const id = generateThinkId();
      const parsed = parseThinkIdTimestamp(id);
      expect(parsed).not.toBeNull();
      // Verify it's within the last minute
      const now = new Date();
      const diff = Math.abs(now.getTime() - (parsed?.getTime() ?? 0));
      expect(diff).toBeLessThan(60000); // Within 1 minute
    });
  });
});
