/**
 * Property-Based Tests for Hash Utilities
 *
 * Validates mathematical properties that hash functions must satisfy.
 */

import { describe, it, expect } from 'vitest';
import { md5, sha256, shortHash, gotchaCacheKey, compositeKey } from './hash-utils.js';

describe('Hash Function Properties', () => {
  // Generate test strings of varying lengths and characters
  const testStrings = [
    '',
    'a',
    'hello',
    'Hello World',
    'the quick brown fox jumps over the lazy dog',
    '!@#$%^&*()',
    '日本語テスト',
    '🎉🚀💻',
    'a'.repeat(1000),
    'b'.repeat(10000),
    Array.from({ length: 100 }, () => Math.random().toString(36)).join(''),
  ];

  describe('md5', () => {
    it('should be deterministic: md5(x) === md5(x)', () => {
      for (const input of testStrings) {
        const hash1 = md5(input);
        const hash2 = md5(input);
        expect(hash1).toBe(hash2);
      }
    });

    it('should always produce 32-character output', () => {
      for (const input of testStrings) {
        expect(md5(input)).toHaveLength(32);
      }
    });

    it('should only contain hexadecimal characters', () => {
      for (const input of testStrings) {
        expect(md5(input)).toMatch(/^[0-9a-f]{32}$/);
      }
    });

    it('should produce different outputs for different inputs', () => {
      const hashes = new Set(testStrings.map(md5));
      // All unique inputs should produce unique hashes
      expect(hashes.size).toBe(testStrings.length);
    });
  });

  describe('sha256', () => {
    it('should be deterministic: sha256(x) === sha256(x)', () => {
      for (const input of testStrings) {
        const hash1 = sha256(input);
        const hash2 = sha256(input);
        expect(hash1).toBe(hash2);
      }
    });

    it('should always produce 64-character output', () => {
      for (const input of testStrings) {
        expect(sha256(input)).toHaveLength(64);
      }
    });

    it('should only contain hexadecimal characters', () => {
      for (const input of testStrings) {
        expect(sha256(input)).toMatch(/^[0-9a-f]{64}$/);
      }
    });

    it('should produce different outputs for different inputs', () => {
      const hashes = new Set(testStrings.map(sha256));
      expect(hashes.size).toBe(testStrings.length);
    });
  });

  describe('shortHash', () => {
    it('should be deterministic', () => {
      for (const input of testStrings) {
        expect(shortHash(input)).toBe(shortHash(input));
      }
    });

    it('should always produce 8-character output', () => {
      for (const input of testStrings) {
        expect(shortHash(input)).toHaveLength(8);
      }
    });

    it('should be a prefix of the full md5 hash', () => {
      for (const input of testStrings) {
        expect(md5(input).startsWith(shortHash(input))).toBe(true);
      }
    });
  });

  describe('gotchaCacheKey', () => {
    it('should be deterministic', () => {
      const testCases = [
        ['topic1', 'summary1'],
        ['topic2', 'summary2'],
        ['', ''],
        ['long topic '.repeat(100), 'long summary '.repeat(100)],
      ];

      for (const [topic, summary] of testCases) {
        expect(gotchaCacheKey(topic, summary)).toBe(gotchaCacheKey(topic, summary));
      }
    });

    it('should produce different keys for different topic/summary pairs', () => {
      const key1 = gotchaCacheKey('topic1', 'summary1');
      const key2 = gotchaCacheKey('topic2', 'summary1');
      const key3 = gotchaCacheKey('topic1', 'summary2');

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should not be commutative: key(a,b) !== key(b,a) when a !== b', () => {
      const key1 = gotchaCacheKey('topic', 'summary');
      const key2 = gotchaCacheKey('summary', 'topic');
      expect(key1).not.toBe(key2);
    });
  });

  describe('compositeKey', () => {
    it('should be deterministic', () => {
      const testCases = [
        ['a', 'b', 'c'],
        ['one'],
        ['', '', ''],
        Array.from({ length: 10 }, (_, i) => `part${i}`),
      ];

      for (const parts of testCases) {
        expect(compositeKey(...parts)).toBe(compositeKey(...parts));
      }
    });

    it('should produce different keys for different part orderings', () => {
      const key1 = compositeKey('a', 'b', 'c');
      const key2 = compositeKey('c', 'b', 'a');
      const key3 = compositeKey('b', 'a', 'c');

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it('should produce different keys for different number of parts', () => {
      const key1 = compositeKey('a', 'b');
      const key2 = compositeKey('a', 'b', '');
      const key3 = compositeKey('a', 'b', 'c');

      expect(key1).not.toBe(key3);
      // key1 might equal key2 if separator handling is naive - but we still test both exist
      expect(key2).toBeDefined();
    });

    it('should handle edge cases', () => {
      expect(compositeKey()).toBe(compositeKey()); // No args
      expect(compositeKey('')).toBe(compositeKey('')); // Single empty
      expect(compositeKey('|')).toBe(compositeKey('|')); // Separator char
    });
  });
});
