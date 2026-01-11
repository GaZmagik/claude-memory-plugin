/**
 * Session Cache for Claude Code Hooks
 *
 * Provides session-scoped deduplication with TTL expiry.
 * Used to prevent showing the same gotcha/warning multiple times per session.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Cache entry with timestamp for TTL
 */
interface CacheEntry {
  hash: string;
  addedAt: number;
}

/**
 * Persisted cache data
 */
interface CacheData {
  entries: CacheEntry[];
  sessionId: string;
}

/**
 * Session cache options
 */
export interface SessionCacheOptions {
  /** Time-to-live in milliseconds (default: 1 hour) */
  ttlMs?: number;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Session-scoped cache with TTL support.
 *
 * Provides deduplication of items within a session with automatic expiry.
 */
export class SessionCache {
  private readonly cacheFile: string;
  private readonly sessionId: string;
  private readonly ttlMs: number;
  private entries: Map<string, number>;

  constructor(
    cacheDir: string,
    sessionId: string,
    options: SessionCacheOptions = {}
  ) {
    this.sessionId = sessionId;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.entries = new Map();

    // Ensure cache directory exists
    mkdirSync(cacheDir, { recursive: true });
    this.cacheFile = join(cacheDir, `session-cache-${sessionId}.json`);

    // Load existing cache
    this.load();
  }

  /**
   * Load cache from disk
   */
  private load(): void {
    if (!existsSync(this.cacheFile)) {
      return;
    }

    try {
      const data: CacheData = JSON.parse(readFileSync(this.cacheFile, 'utf-8'));

      // Verify session ID matches
      if (data.sessionId !== this.sessionId) {
        return;
      }

      const now = Date.now();
      for (const entry of data.entries || []) {
        // Skip expired entries
        if (now - entry.addedAt < this.ttlMs) {
          this.entries.set(entry.hash, entry.addedAt);
        }
      }
    } catch {
      // Corrupted cache, start fresh
      this.entries.clear();
    }
  }

  /**
   * Save cache to disk
   */
  private save(): void {
    try {
      const data: CacheData = {
        sessionId: this.sessionId,
        entries: Array.from(this.entries.entries()).map(([hash, addedAt]) => ({
          hash,
          addedAt,
        })),
      };
      writeFileSync(this.cacheFile, JSON.stringify(data, null, 2));
    } catch {
      // Cache write failed, continue anyway
    }
  }

  /**
   * Check if a hash exists in the cache (and is not expired)
   */
  has(hash: string): boolean {
    const addedAt = this.entries.get(hash);
    if (addedAt === undefined) {
      return false;
    }

    // Check TTL
    if (Date.now() - addedAt >= this.ttlMs) {
      this.entries.delete(hash);
      return false;
    }

    return true;
  }

  /**
   * Add a hash to the cache
   */
  add(hash: string): void {
    this.entries.set(hash, Date.now());
    this.save();
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [hash, addedAt] of this.entries) {
      if (now - addedAt >= this.ttlMs) {
        this.entries.delete(hash);
      }
    }
    this.save();
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
    this.save();
  }

  /**
   * Get number of entries (for debugging)
   */
  get size(): number {
    return this.entries.size;
  }
}

/**
 * Create a session cache for gotcha deduplication
 */
export function createGotchaCache(
  projectDir: string,
  sessionId: string
): SessionCache {
  const cacheDir = join(projectDir, '.claude', 'cache', 'memory-context');
  return new SessionCache(cacheDir, sessionId);
}
