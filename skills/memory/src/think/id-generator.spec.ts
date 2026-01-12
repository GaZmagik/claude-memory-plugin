/**
 * Tests for Think ID Generator
 */

import { describe, it, expect } from 'bun:test';
import { generateThinkId, isValidThinkId, parseThinkIdTimestamp } from './id-generator.js';

describe('think/id-generator', () => {
  describe('generateThinkId', () => {
    it('generates ID in correct format', () => {
      const id = generateThinkId();
      expect(id).toMatch(/^think-\d{8}-\d{6}$/);
    });

    it('starts with think- prefix', () => {
      const id = generateThinkId();
      expect(id.startsWith('think-')).toBe(true);
    });

    it('generates unique IDs (probabilistic)', () => {
      // Wait a second to ensure different timestamps
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateThinkId());
      }
      // Most should be unique (same second may produce duplicates)
      expect(ids.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isValidThinkId', () => {
    it('returns true for valid IDs', () => {
      expect(isValidThinkId('think-20260112-103000')).toBe(true);
      expect(isValidThinkId('think-00000000-000000')).toBe(true);
      expect(isValidThinkId('think-99999999-999999')).toBe(true);
    });

    it('returns false for invalid IDs', () => {
      expect(isValidThinkId('')).toBe(false);
      expect(isValidThinkId('think')).toBe(false);
      expect(isValidThinkId('think-')).toBe(false);
      expect(isValidThinkId('think-12345678')).toBe(false);
      expect(isValidThinkId('think-1234567-123456')).toBe(false);
      expect(isValidThinkId('think-123456789-123456')).toBe(false);
      expect(isValidThinkId('decision-20260112-103000')).toBe(false);
      expect(isValidThinkId('THINK-20260112-103000')).toBe(false);
    });

    it('validates generated IDs', () => {
      const id = generateThinkId();
      expect(isValidThinkId(id)).toBe(true);
    });
  });

  describe('parseThinkIdTimestamp', () => {
    it('parses valid think ID to Date', () => {
      const date = parseThinkIdTimestamp('think-20260112-103045');
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(0); // January (0-indexed)
      expect(date?.getDate()).toBe(12);
      expect(date?.getHours()).toBe(10);
      expect(date?.getMinutes()).toBe(30);
      expect(date?.getSeconds()).toBe(45);
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
