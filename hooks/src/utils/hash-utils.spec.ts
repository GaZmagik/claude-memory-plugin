/**
 * Unit tests for hooks/src/utils/hash-utils.ts
 */

import { describe, it, expect } from 'vitest';
import {
  md5,
  sha256,
  shortHash,
  gotchaCacheKey,
  compositeKey,
} from './hash-utils.js';

describe('hash-utils', () => {
  describe('md5', () => {
    it('should generate consistent MD5 hash', () => {
      const input = 'test string';
      const hash1 = md5(input);
      const hash2 = md5(input);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = md5('input1');
      const hash2 = md5('input2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = md5('');

      expect(hash).toMatch(/^[a-f0-9]{32}$/);
      expect(hash).toBe('d41d8cd98f00b204e9800998ecf8427e'); // Known MD5 of empty string
    });

    it('should handle Unicode characters', () => {
      const hash = md5('Hello 世界 🌍');

      expect(hash).toMatch(/^[a-f0-9]{32}$/);
      expect(hash).toBe(md5('Hello 世界 🌍')); // Consistent
    });

    it('should handle long strings', () => {
      const longString = 'a'.repeat(10000);
      const hash = md5(longString);

      expect(hash).toMatch(/^[a-f0-9]{32}$/);
      expect(hash.length).toBe(32);
    });

    it('should generate known MD5 hashes', () => {
      expect(md5('hello')).toBe('5d41402abc4b2a76b9719d911017c592');
      expect(md5('world')).toBe('7d793037a0760186574b0282f2f435e7');
    });
  });

  describe('sha256', () => {
    it('should generate consistent SHA-256 hash', () => {
      const input = 'test string';
      const hash1 = sha256(input);
      const hash2 = sha256(input);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = sha256('input1');
      const hash2 = sha256('input2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = sha256('');

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      ); // Known SHA-256 of empty string
    });

    it('should handle Unicode characters', () => {
      const hash = sha256('Hello 世界 🌍');

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).toBe(sha256('Hello 世界 🌍')); // Consistent
    });

    it('should be different from MD5 output', () => {
      const input = 'test';
      const md5Hash = md5(input);
      const sha256Hash = sha256(input);

      expect(md5Hash.length).toBe(32);
      expect(sha256Hash.length).toBe(64);
      expect(md5Hash).not.toBe(sha256Hash.slice(0, 32));
    });

    it('should generate known SHA-256 hashes', () => {
      expect(sha256('hello')).toBe(
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
      );
    });
  });

  describe('shortHash', () => {
    it('should generate 8-character hash', () => {
      const hash = shortHash('test string');

      expect(hash).toMatch(/^[a-f0-9]{8}$/);
      expect(hash.length).toBe(8);
    });

    it('should be prefix of full MD5 hash', () => {
      const input = 'test string';
      const full = md5(input);
      const short = shortHash(input);

      expect(full.startsWith(short)).toBe(true);
      expect(full.slice(0, 8)).toBe(short);
    });

    it('should generate consistent short hashes', () => {
      const hash1 = shortHash('test');
      const hash2 = shortHash('test');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = shortHash('input1');
      const hash2 = shortHash('input2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle collision risk for similar inputs', () => {
      // Short hashes have higher collision risk
      const hash1 = shortHash('test1');
      const hash2 = shortHash('test2');

      // They should still be different for these inputs
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = shortHash('');

      expect(hash).toMatch(/^[a-f0-9]{8}$/);
      expect(hash).toBe('d41d8cd9'); // First 8 chars of MD5 of empty string
    });
  });

  describe('gotchaCacheKey', () => {
    it('should generate cache key from topic and summary', () => {
      const key = gotchaCacheKey('testing', 'Unit tests are important');

      expect(key).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate consistent keys', () => {
      const key1 = gotchaCacheKey('testing', 'summary');
      const key2 = gotchaCacheKey('testing', 'summary');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different topics', () => {
      const key1 = gotchaCacheKey('topic1', 'summary');
      const key2 = gotchaCacheKey('topic2', 'summary');

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different summaries', () => {
      const key1 = gotchaCacheKey('topic', 'summary1');
      const key2 = gotchaCacheKey('topic', 'summary2');

      expect(key1).not.toBe(key2);
    });

    it('should use colon separator', () => {
      const topic = 'testing';
      const summary = 'important gotcha';
      const key = gotchaCacheKey(topic, summary);

      // Should match md5 of "testing:important gotcha"
      expect(key).toBe(md5(`${topic}:${summary}`));
    });

    it('should handle empty strings', () => {
      const key = gotchaCacheKey('', '');

      expect(key).toMatch(/^[a-f0-9]{32}$/);
      expect(key).toBe(md5(':'));
    });

    it('should handle special characters in inputs', () => {
      const key = gotchaCacheKey('topic/with:special', 'summary\nwith\ttabs');

      expect(key).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should differentiate order of inputs', () => {
      const key1 = gotchaCacheKey('abc', 'def');
      const key2 = gotchaCacheKey('def', 'abc');

      expect(key1).not.toBe(key2);
    });
  });

  describe('compositeKey', () => {
    it('should generate key from multiple parts', () => {
      const key = compositeKey('part1', 'part2', 'part3');

      expect(key).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate consistent keys', () => {
      const key1 = compositeKey('a', 'b', 'c');
      const key2 = compositeKey('a', 'b', 'c');

      expect(key1).toBe(key2);
    });

    it('should use pipe separator', () => {
      const parts = ['part1', 'part2', 'part3'];
      const key = compositeKey(...parts);

      expect(key).toBe(md5(parts.join('|')));
    });

    it('should handle single part', () => {
      const key = compositeKey('single');

      expect(key).toBe(md5('single'));
    });

    it('should handle no parts', () => {
      const key = compositeKey();

      expect(key).toBe(md5(''));
    });

    it('should differentiate order of parts', () => {
      const key1 = compositeKey('a', 'b', 'c');
      const key2 = compositeKey('c', 'b', 'a');

      expect(key1).not.toBe(key2);
    });

    it('should handle empty string parts', () => {
      const key = compositeKey('a', '', 'c');

      expect(key).toBe(md5('a||c'));
    });

    it('should handle many parts', () => {
      const parts = Array.from({ length: 100 }, (_, i) => `part${i}`);
      const key = compositeKey(...parts);

      expect(key).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should handle special characters', () => {
      const key = compositeKey('part/1', 'part:2', 'part\n3');

      expect(key).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should differentiate from joined without separator', () => {
      const key1 = compositeKey('ab', 'c');
      const key2 = compositeKey('a', 'bc');

      // These should be different because of the pipe separator
      expect(key1).not.toBe(key2);
    });
  });

/**
   * Property-based tests for hash function invariants
   * Merged from hash-utils.property.spec.ts
   */
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

    it('md5 should be deterministic across diverse inputs', () => {
      for (const input of testStrings) {
        expect(md5(input)).toBe(md5(input));
      }
    });

    it('sha256 should be deterministic across diverse inputs', () => {
      for (const input of testStrings) {
        expect(sha256(input)).toBe(sha256(input));
      }
    });

    it('md5 should produce unique hashes for all test strings', () => {
      const hashes = new Set(testStrings.map(md5));
      expect(hashes.size).toBe(testStrings.length);
    });

    it('sha256 should produce unique hashes for all test strings', () => {
      const hashes = new Set(testStrings.map(sha256));
      expect(hashes.size).toBe(testStrings.length);
    });

    it('gotchaCacheKey should not be commutative', () => {
      const key1 = gotchaCacheKey('topic', 'summary');
      const key2 = gotchaCacheKey('summary', 'topic');
      expect(key1).not.toBe(key2);
    });

    it('compositeKey should produce different keys for different orderings', () => {
      const key1 = compositeKey('a', 'b', 'c');
      const key2 = compositeKey('c', 'b', 'a');
      const key3 = compositeKey('b', 'a', 'c');

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it('compositeKey should handle edge cases consistently', () => {
      expect(compositeKey()).toBe(compositeKey()); // No args
      expect(compositeKey('')).toBe(compositeKey('')); // Single empty
      expect(compositeKey('|')).toBe(compositeKey('|')); // Separator char
    });
  });

  describe('hash collision resistance', () => {
    it('should handle similar inputs without collision', () => {
      const hashes = [
        md5('test1'),
        md5('test2'),
        md5('test3'),
        md5('test4'),
        md5('test5'),
      ];

      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(hashes.length);
    });

    it('should handle inputs that differ by one character', () => {
      const base = 'a'.repeat(100);
      const hash1 = md5(base);
      const hash2 = md5(base + 'b');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for whitespace variations', () => {
      const hash1 = md5('test');
      const hash2 = md5('test ');
      const hash3 = md5(' test');

      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);
    });
  });
});
