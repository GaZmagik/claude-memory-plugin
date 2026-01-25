/**
 * Hint Tracker for Progressive Disclosure
 *
 * Manages hint display state across a session with persistence.
 * Hints are shown for the first N uses of a command, then suppressed.
 */

import { access, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type {
  HintState,
  HintTrackerOptions,
  HintThresholdConfig,
} from '../types/hint-state.js';

// Re-export types for convenience
export type { HintState, HintTrackerOptions, HintThresholdConfig };

/** Default number of times to show hint before stopping */
export const DEFAULT_HINT_THRESHOLD = 3;

/** Default TTL for hint state (1 hour) */
const DEFAULT_TTL_MS = 60 * 60 * 1000;

/**
 * HintTracker class for managing progressive hint disclosure
 *
 * Tracks how many times hints have been shown per command type
 * and persists state to disk for session continuity.
 */
export class HintTracker {
  private readonly cacheFile: string;
  private readonly sessionId: string;
  private readonly ttlMs: number;
  private counts: Map<string, number>;
  private lastShown: number;

  private constructor(
    cacheFile: string,
    sessionId: string,
    ttlMs: number,
    counts: Map<string, number>,
    lastShown: number
  ) {
    this.cacheFile = cacheFile;
    this.sessionId = sessionId;
    this.ttlMs = ttlMs;
    this.counts = counts;
    this.lastShown = lastShown;
  }

  /**
   * Create a new HintTracker instance (async factory)
   *
   * @param cacheDir - Directory to store hint state
   * @param sessionId - Session identifier for isolation
   * @param options - Optional configuration
   */
  static async create(
    cacheDir: string,
    sessionId: string,
    options: HintTrackerOptions = {}
  ): Promise<HintTracker> {
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    const cacheFile = join(cacheDir, `hint-state-${sessionId}.json`);

    // Ensure cache directory exists
    await mkdir(cacheDir, { recursive: true });

    // Load existing state
    const { counts, lastShown } = await HintTracker.loadState(
      cacheFile,
      sessionId,
      ttlMs
    );

    return new HintTracker(cacheFile, sessionId, ttlMs, counts, lastShown);
  }

  /**
   * Load hint state from disk
   */
  private static async loadState(
    cacheFile: string,
    sessionId: string,
    ttlMs: number
  ): Promise<{ counts: Map<string, number>; lastShown: number }> {
    const counts = new Map<string, number>();
    let lastShown = 0;

    try {
      await access(cacheFile);
    } catch {
      // File doesn't exist
      return { counts, lastShown };
    }

    try {
      const content = await readFile(cacheFile, 'utf-8');
      const data: HintState = JSON.parse(content);

      // Verify session ID matches
      if (data.sessionId !== sessionId) {
        return { counts, lastShown };
      }

      // Check TTL (if state is too old, start fresh)
      const now = Date.now();
      if (data.lastShown && now - data.lastShown >= ttlMs) {
        return { counts, lastShown };
      }

      // Load counts
      for (const [key, value] of Object.entries(data.counts || {})) {
        counts.set(key, value);
      }
      lastShown = data.lastShown || 0;
    } catch {
      // Corrupted file, start fresh
    }

    return { counts, lastShown };
  }

  /**
   * Save hint state to disk
   */
  private async save(): Promise<void> {
    try {
      const data: HintState = {
        sessionId: this.sessionId,
        counts: Object.fromEntries(this.counts),
        lastShown: this.lastShown,
      };
      await writeFile(this.cacheFile, JSON.stringify(data, null, 2));
    } catch {
      // Cache write failed, continue anyway
    }
  }

  /**
   * Get the hint count for a specific command
   *
   * @param command - Command identifier (e.g., 'think:create')
   * @returns Number of times hint has been shown
   */
  getCount(command: string): number {
    return this.counts.get(command) ?? 0;
  }

  /**
   * Increment the hint count for a command
   *
   * @param command - Command identifier
   */
  async increment(command: string): Promise<void> {
    const current = this.counts.get(command) ?? 0;
    this.counts.set(command, current + 1);
    this.lastShown = Date.now();
    await this.save();
  }

  /**
   * Clear all hint counts
   */
  async clear(): Promise<void> {
    this.counts.clear();
    await this.save();
  }

  /**
   * Get total count across all commands
   */
  getTotalCount(): number {
    let total = 0;
    for (const count of this.counts.values()) {
      total += count;
    }
    return total;
  }
}

/**
 * Check if a hint should be shown for a command
 *
 * @param tracker - HintTracker instance
 * @param command - Command identifier
 * @param config - Optional threshold configuration
 * @returns true if hint should be shown
 */
export function shouldShowHint(
  tracker: HintTracker,
  command: string,
  config?: HintThresholdConfig
): boolean {
  const threshold = config?.threshold ?? DEFAULT_HINT_THRESHOLD;

  // Negative or zero threshold means never show
  if (threshold <= 0) {
    return false;
  }

  const count = tracker.getCount(command);
  return count < threshold;
}
