/**
 * Session Cache for Claude Code Hooks
 *
 * Provides session-scoped deduplication with TTL expiry.
 * Used to prevent showing the same gotcha/warning multiple times per session.
 */

import { access, readFile, writeFile, mkdir } from 'fs/promises';
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
 * Use the static `create()` method to instantiate.
 */
export class SessionCache {
  private readonly cacheFile: string;
  private readonly sessionId: string;
  private readonly ttlMs: number;
  private entries: Map<string, number>;

  private constructor(
    cacheFile: string,
    sessionId: string,
    ttlMs: number,
    entries: Map<string, number>
  ) {
    this.cacheFile = cacheFile;
    this.sessionId = sessionId;
    this.ttlMs = ttlMs;
    this.entries = entries;
  }

  /**
   * Create a new SessionCache instance (async factory)
   */
  static async create(
    cacheDir: string,
    sessionId: string,
    options: SessionCacheOptions = {}
  ): Promise<SessionCache> {
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    const cacheFile = join(cacheDir, `session-cache-${sessionId}.json`);

    // Ensure cache directory exists
    await mkdir(cacheDir, { recursive: true });

    // Load existing cache
    const entries = await SessionCache.loadEntries(cacheFile, sessionId, ttlMs);

    return new SessionCache(cacheFile, sessionId, ttlMs, entries);
  }

  /**
   * Load cache entries from disk
   */
  private static async loadEntries(
    cacheFile: string,
    sessionId: string,
    ttlMs: number
  ): Promise<Map<string, number>> {
    const entries = new Map<string, number>();

    try {
      await access(cacheFile);
    } catch {
      // File doesn't exist
      return entries;
    }

    try {
      const content = await readFile(cacheFile, 'utf-8');
      const data: CacheData = JSON.parse(content);

      // Verify session ID matches
      if (data.sessionId !== sessionId) {
        return entries;
      }

      const now = Date.now();
      for (const entry of data.entries || []) {
        // Skip expired entries
        if (now - entry.addedAt < ttlMs) {
          entries.set(entry.hash, entry.addedAt);
        }
      }
    } catch {
      // Corrupted cache, start fresh
    }

    return entries;
  }

  /**
   * Save cache to disk
   */
  private async save(): Promise<void> {
    try {
      const data: CacheData = {
        sessionId: this.sessionId,
        entries: Array.from(this.entries.entries()).map(([hash, addedAt]) => ({
          hash,
          addedAt,
        })),
      };
      await writeFile(this.cacheFile, JSON.stringify(data, null, 2));
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
  async add(hash: string): Promise<void> {
    this.entries.set(hash, Date.now());
    await this.save();
  }

  /**
   * Remove expired entries
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [hash, addedAt] of this.entries) {
      if (now - addedAt >= this.ttlMs) {
        this.entries.delete(hash);
      }
    }
    await this.save();
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    this.entries.clear();
    await this.save();
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
export async function createGotchaCache(
  projectDir: string,
  sessionId: string
): Promise<SessionCache> {
  const cacheDir = join(projectDir, '.claude', 'cache', 'memory-context');
  return SessionCache.create(cacheDir, sessionId);
}
