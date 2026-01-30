/**
 * Unit tests for hooks/src/session/session-cache.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, existsSync, mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  SessionCache,
  createGotchaCache,
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

  describe('create factory', () => {
    it('should create cache directory if it does not exist', async () => {
      await SessionCache.create(testCacheDir, testSessionId);

      expect(existsSync(testCacheDir)).toBe(true);
    });

    it('should use default TTL when not provided', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId);

      expect(cache.size).toBe(0);
    });

    it('should accept custom TTL', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId, {
        ttlMs: 5000,
      });

      expect(cache.size).toBe(0);
    });

    it('should create cache file when first entry is added', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId);
      await cache.add('test-hash');

      const expectedFile = join(testCacheDir, `session-cache-${testSessionId}.json`);
      expect(existsSync(expectedFile)).toBe(true);
    });

    it('should handle existing cache directory', async () => {
      mkdirSync(testCacheDir, { recursive: true });

      await expect(SessionCache.create(testCacheDir, testSessionId)).resolves.toBeDefined();
    });
  });

  describe('add and has', () => {
    it('should add hash to cache', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId);
      const hash = 'test-hash-123';

      await cache.add(hash);

      expect(cache.has(hash)).toBe(true);
      expect(cache.size).toBe(1);
    });

    it('should return false for non-existent hash', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId);

      expect(cache.has('non-existent')).toBe(false);
    });

    it('should handle multiple hashes', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId);

      await cache.add('hash1');
      await cache.add('hash2');
      await cache.add('hash3');

      expect(cache.has('hash1')).toBe(true);
      expect(cache.has('hash2')).toBe(true);
      expect(cache.has('hash3')).toBe(true);
      expect(cache.size).toBe(3);
    });

    it('should not add duplicate hashes', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId);

      await cache.add('hash1');
      await cache.add('hash1');
      await cache.add('hash1');

      expect(cache.size).toBe(1);
    });

    it('should update timestamp when adding existing hash', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId);

      await cache.add('hash1');

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      await cache.add('hash1');
      expect(cache.has('hash1')).toBe(true);
      expect(cache.size).toBe(1); // Still only one entry
    });
  });

  describe('TTL expiry', () => {
    it('should expire entries after TTL', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId, {
        ttlMs: 50, // 50ms TTL for testing
      });

      await cache.add('hash1');
      expect(cache.has('hash1')).toBe(true);

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cache.has('hash1')).toBe(false);
    });

    it('should not expire entries before TTL', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId, {
        ttlMs: 200, // 200ms TTL
      });

      await cache.add('hash1');
      expect(cache.has('hash1')).toBe(true);

      // Wait less than TTL
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(cache.has('hash1')).toBe(true);
    });

    it('should handle mixed expired and valid entries', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId, {
        ttlMs: 100,
      });

      await cache.add('old-hash');

      // Wait for first to expire
      await new Promise((resolve) => setTimeout(resolve, 110));

      await cache.add('new-hash');

      expect(cache.has('old-hash')).toBe(false);
      expect(cache.has('new-hash')).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist cache to disk', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId);
      await cache.add('hash1');

      const cacheFile = join(testCacheDir, `session-cache-${testSessionId}.json`);
      expect(existsSync(cacheFile)).toBe(true);
    });

    it('should load existing cache from disk', async () => {
      // Create first cache and add entry
      const cache1 = await SessionCache.create(testCacheDir, testSessionId);
      await cache1.add('persistent-hash');

      // Create second cache with same session ID
      const cache2 = await SessionCache.create(testCacheDir, testSessionId);

      expect(cache2.has('persistent-hash')).toBe(true);
      expect(cache2.size).toBe(1);
    });

    it('should not load cache with different session ID', async () => {
      const cache1 = await SessionCache.create(testCacheDir, 'session-1');
      await cache1.add('hash1');

      const cache2 = await SessionCache.create(testCacheDir, 'session-2');

      expect(cache2.has('hash1')).toBe(false);
      expect(cache2.size).toBe(0);
    });

    it('should skip expired entries when loading from disk', async () => {
      const cache1 = await SessionCache.create(testCacheDir, testSessionId, {
        ttlMs: 50,
      });
      await cache1.add('hash1');

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Create new cache - should not load expired entry
      const cache2 = await SessionCache.create(testCacheDir, testSessionId, {
        ttlMs: 50,
      });

      expect(cache2.has('hash1')).toBe(false);
    });

    it('should handle corrupted cache file gracefully', async () => {
      const cache1 = await SessionCache.create(testCacheDir, testSessionId);
      await cache1.add('hash1');

      // Corrupt the cache file
      const cacheFile = join(testCacheDir, `session-cache-${testSessionId}.json`);
      writeFileSync(cacheFile, '{ invalid json }');

      // Should start fresh without error
      const cache2 = await SessionCache.create(testCacheDir, testSessionId);
      expect(cache2.size).toBe(0);
    });

    it('should handle missing cache file gracefully', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId);
      expect(cache.size).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId, {
        ttlMs: 50,
      });

      await cache.add('hash1');
      await cache.add('hash2');

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 60));

      await cache.cleanup();

      expect(cache.size).toBe(0);
    });

    it('should keep valid entries during cleanup', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId, {
        ttlMs: 50,
      });

      await cache.add('old-hash');

      await new Promise((resolve) => setTimeout(resolve, 60)); // Wait longer than TTL

      await cache.add('new-hash');

      await cache.cleanup();

      expect(cache.has('old-hash')).toBe(false); // Expired (60ms > 50ms TTL)
      expect(cache.has('new-hash')).toBe(true);  // Fresh
      expect(cache.size).toBe(1);
    });

    it('should persist changes after cleanup', async () => {
      const cache1 = await SessionCache.create(testCacheDir, testSessionId, {
        ttlMs: 50,
      });

      await cache1.add('hash1');
      await new Promise((resolve) => setTimeout(resolve, 60));
      await cache1.cleanup();

      const cache2 = await SessionCache.create(testCacheDir, testSessionId);
      expect(cache2.size).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all entries', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId);

      await cache.add('hash1');
      await cache.add('hash2');
      await cache.add('hash3');

      await cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.has('hash1')).toBe(false);
      expect(cache.has('hash2')).toBe(false);
      expect(cache.has('hash3')).toBe(false);
    });

    it('should persist cleared state', async () => {
      const cache1 = await SessionCache.create(testCacheDir, testSessionId);
      await cache1.add('hash1');
      await cache1.clear();

      const cache2 = await SessionCache.create(testCacheDir, testSessionId);
      expect(cache2.size).toBe(0);
    });

    it('should handle clearing empty cache', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId);

      await expect(cache.clear()).resolves.toBeUndefined();
      expect(cache.size).toBe(0);
    });
  });

  describe('size property', () => {
    it('should return correct count', async () => {
      const cache = await SessionCache.create(testCacheDir, testSessionId);

      expect(cache.size).toBe(0);

      await cache.add('hash1');
      expect(cache.size).toBe(1);

      await cache.add('hash2');
      expect(cache.size).toBe(2);

      await cache.clear();
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

  it('should create cache in .claude/cache/memory-context', async () => {
    const cache = await createGotchaCache(testProjectDir, testSessionId);

    const expectedDir = join(
      testProjectDir,
      '.claude',
      'cache',
      'memory-context'
    );
    expect(existsSync(expectedDir)).toBe(true);

    await cache.add('test');
    expect(cache.has('test')).toBe(true);
  });

  it('should return functional SessionCache instance', async () => {
    const cache = await createGotchaCache(testProjectDir, testSessionId);

    await cache.add('hash1');
    expect(cache.has('hash1')).toBe(true);
    expect(cache.size).toBe(1);
  });

  it('should handle nested directory creation', async () => {
    await expect(createGotchaCache(testProjectDir, testSessionId)).resolves.toBeDefined();
  });
});
