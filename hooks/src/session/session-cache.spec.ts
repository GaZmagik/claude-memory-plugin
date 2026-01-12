/**
 * Unit tests for hooks/src/session/session-cache.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  SessionCache,
  createGotchaCache,
  type SessionCacheOptions,
} from './session-cache.js';

describe('SessionCache', () => {
  let testCacheDir = '';
  const testSessionId = 'test-session-123';

  beforeEach(() => {
    // Create unique temporary directory for each test
    testCacheDir = mkdtempSync(join(tmpdir(), 'claude-test-cache-'));
  });

  afterEach(() => {
    // Clean up after each test
    if (existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true });
    }
  });

  describe('constructor', () => {
    it('should create cache directory if it does not exist', () => {
      new SessionCache(testCacheDir, testSessionId);

      expect(existsSync(testCacheDir)).toBe(true);
    });

    it('should use default TTL when not provided', () => {
      const cache = new SessionCache(testCacheDir, testSessionId);

      expect(cache.size).toBe(0);
    });

    it('should accept custom TTL', () => {
      const cache = new SessionCache(testCacheDir, testSessionId, {
        ttlMs: 5000,
      });

      expect(cache.size).toBe(0);
    });

    it('should create cache file when first entry is added', () => {
      const cache = new SessionCache(testCacheDir, testSessionId);
      cache.add('test-hash');

      const expectedFile = join(testCacheDir, `session-cache-${testSessionId}.json`);
      expect(existsSync(expectedFile)).toBe(true);
    });

    it('should handle existing cache directory', () => {
      mkdirSync(testCacheDir, { recursive: true });

      expect(() => {
        new SessionCache(testCacheDir, testSessionId);
      }).not.toThrow();
    });
  });

  describe('add and has', () => {
    it('should add hash to cache', () => {
      const cache = new SessionCache(testCacheDir, testSessionId);
      const hash = 'test-hash-123';

      cache.add(hash);

      expect(cache.has(hash)).toBe(true);
      expect(cache.size).toBe(1);
    });

    it('should return false for non-existent hash', () => {
      const cache = new SessionCache(testCacheDir, testSessionId);

      expect(cache.has('non-existent')).toBe(false);
    });

    it('should handle multiple hashes', () => {
      const cache = new SessionCache(testCacheDir, testSessionId);

      cache.add('hash1');
      cache.add('hash2');
      cache.add('hash3');

      expect(cache.has('hash1')).toBe(true);
      expect(cache.has('hash2')).toBe(true);
      expect(cache.has('hash3')).toBe(true);
      expect(cache.size).toBe(3);
    });

    it('should not add duplicate hashes', () => {
      const cache = new SessionCache(testCacheDir, testSessionId);

      cache.add('hash1');
      cache.add('hash1');
      cache.add('hash1');

      expect(cache.size).toBe(1);
    });

    it('should update timestamp when adding existing hash', async () => {
      const cache = new SessionCache(testCacheDir, testSessionId);

      cache.add('hash1');

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      cache.add('hash1');
      expect(cache.has('hash1')).toBe(true);
      expect(cache.size).toBe(1); // Still only one entry
    });
  });

  describe('TTL expiry', () => {
    it('should expire entries after TTL', async () => {
      const cache = new SessionCache(testCacheDir, testSessionId, {
        ttlMs: 50, // 50ms TTL for testing
      });

      cache.add('hash1');
      expect(cache.has('hash1')).toBe(true);

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cache.has('hash1')).toBe(false);
    });

    it('should not expire entries before TTL', async () => {
      const cache = new SessionCache(testCacheDir, testSessionId, {
        ttlMs: 200, // 200ms TTL
      });

      cache.add('hash1');
      expect(cache.has('hash1')).toBe(true);

      // Wait less than TTL
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(cache.has('hash1')).toBe(true);
    });

    it('should handle mixed expired and valid entries', async () => {
      const cache = new SessionCache(testCacheDir, testSessionId, {
        ttlMs: 100,
      });

      cache.add('old-hash');

      // Wait for first to expire
      await new Promise((resolve) => setTimeout(resolve, 110));

      cache.add('new-hash');

      expect(cache.has('old-hash')).toBe(false);
      expect(cache.has('new-hash')).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist cache to disk', () => {
      const cache = new SessionCache(testCacheDir, testSessionId);
      cache.add('hash1');

      const cacheFile = join(testCacheDir, `session-cache-${testSessionId}.json`);
      expect(existsSync(cacheFile)).toBe(true);
    });

    it('should load existing cache from disk', () => {
      // Create first cache and add entry
      const cache1 = new SessionCache(testCacheDir, testSessionId);
      cache1.add('persistent-hash');

      // Create second cache with same session ID
      const cache2 = new SessionCache(testCacheDir, testSessionId);

      expect(cache2.has('persistent-hash')).toBe(true);
      expect(cache2.size).toBe(1);
    });

    it('should not load cache with different session ID', () => {
      const cache1 = new SessionCache(testCacheDir, 'session-1');
      cache1.add('hash1');

      const cache2 = new SessionCache(testCacheDir, 'session-2');

      expect(cache2.has('hash1')).toBe(false);
      expect(cache2.size).toBe(0);
    });

    it('should skip expired entries when loading from disk', async () => {
      const cache1 = new SessionCache(testCacheDir, testSessionId, {
        ttlMs: 50,
      });
      cache1.add('hash1');

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Create new cache - should not load expired entry
      const cache2 = new SessionCache(testCacheDir, testSessionId, {
        ttlMs: 50,
      });

      expect(cache2.has('hash1')).toBe(false);
    });

    it('should handle corrupted cache file gracefully', () => {
      const cache1 = new SessionCache(testCacheDir, testSessionId);
      cache1.add('hash1');

      // Corrupt the cache file
      const cacheFile = join(testCacheDir, `session-cache-${testSessionId}.json`);
      const fs = require('fs');
      fs.writeFileSync(cacheFile, '{ invalid json }');

      // Should start fresh without error
      expect(() => {
        const cache2 = new SessionCache(testCacheDir, testSessionId);
        expect(cache2.size).toBe(0);
      }).not.toThrow();
    });

    it('should handle missing cache file gracefully', () => {
      expect(() => {
        const cache = new SessionCache(testCacheDir, testSessionId);
        expect(cache.size).toBe(0);
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      const cache = new SessionCache(testCacheDir, testSessionId, {
        ttlMs: 50,
      });

      cache.add('hash1');
      cache.add('hash2');

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 60));

      cache.cleanup();

      expect(cache.size).toBe(0);
    });

    it('should keep valid entries during cleanup', async () => {
      const cache = new SessionCache(testCacheDir, testSessionId, {
        ttlMs: 50,
      });

      cache.add('old-hash');

      await new Promise((resolve) => setTimeout(resolve, 60)); // Wait longer than TTL

      cache.add('new-hash');

      cache.cleanup();

      expect(cache.has('old-hash')).toBe(false); // Expired (60ms > 50ms TTL)
      expect(cache.has('new-hash')).toBe(true);  // Fresh
      expect(cache.size).toBe(1);
    });

    it('should persist changes after cleanup', async () => {
      const cache1 = new SessionCache(testCacheDir, testSessionId, {
        ttlMs: 50,
      });

      cache1.add('hash1');
      await new Promise((resolve) => setTimeout(resolve, 60));
      cache1.cleanup();

      const cache2 = new SessionCache(testCacheDir, testSessionId);
      expect(cache2.size).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      const cache = new SessionCache(testCacheDir, testSessionId);

      cache.add('hash1');
      cache.add('hash2');
      cache.add('hash3');

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.has('hash1')).toBe(false);
      expect(cache.has('hash2')).toBe(false);
      expect(cache.has('hash3')).toBe(false);
    });

    it('should persist cleared state', () => {
      const cache1 = new SessionCache(testCacheDir, testSessionId);
      cache1.add('hash1');
      cache1.clear();

      const cache2 = new SessionCache(testCacheDir, testSessionId);
      expect(cache2.size).toBe(0);
    });

    it('should handle clearing empty cache', () => {
      const cache = new SessionCache(testCacheDir, testSessionId);

      expect(() => cache.clear()).not.toThrow();
      expect(cache.size).toBe(0);
    });
  });

  describe('size property', () => {
    it('should return correct count', () => {
      const cache = new SessionCache(testCacheDir, testSessionId);

      expect(cache.size).toBe(0);

      cache.add('hash1');
      expect(cache.size).toBe(1);

      cache.add('hash2');
      expect(cache.size).toBe(2);

      cache.clear();
      expect(cache.size).toBe(0);
    });
  });
});

describe('createGotchaCache', () => {
  let testProjectDir = '';
  const testSessionId = 'test-session-456';

  beforeEach(() => {
    // Create unique temporary directory for each test
    testProjectDir = mkdtempSync(join(tmpdir(), 'claude-test-project-'));
  });

  afterEach(() => {
    if (existsSync(testProjectDir)) {
      rmSync(testProjectDir, { recursive: true });
    }
  });

  it('should create cache in .claude/cache/memory-context', () => {
    const cache = createGotchaCache(testProjectDir, testSessionId);

    const expectedDir = join(
      testProjectDir,
      '.claude',
      'cache',
      'memory-context'
    );
    expect(existsSync(expectedDir)).toBe(true);

    cache.add('test');
    expect(cache.has('test')).toBe(true);
  });

  it('should return functional SessionCache instance', () => {
    const cache = createGotchaCache(testProjectDir, testSessionId);

    cache.add('hash1');
    expect(cache.has('hash1')).toBe(true);
    expect(cache.size).toBe(1);
  });

  it('should handle nested directory creation', () => {
    expect(() => {
      createGotchaCache(testProjectDir, testSessionId);
    }).not.toThrow();
  });
});
