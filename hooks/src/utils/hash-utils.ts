/**
 * Hash Utilities for Claude Code Hooks
 *
 * Provides consistent hashing for cache keys and deduplication.
 */

import { createHash } from 'crypto';

/**
 * Generate an MD5 hash of the input string.
 * Used for cache key generation.
 */
export function md5(input: string): string {
  return createHash('md5').update(input).digest('hex');
}

/**
 * Generate a SHA-256 hash of the input string.
 * Used for more security-sensitive hashing.
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a short hash (first 8 characters) for display.
 */
export function shortHash(input: string): string {
  return md5(input).slice(0, 8);
}

/**
 * Generate a cache key from topic and summary.
 * Used for gotcha deduplication.
 */
export function gotchaCacheKey(topic: string, summary: string): string {
  return md5(`${topic}:${summary}`);
}

/**
 * Generate a cache key from multiple inputs.
 */
export function compositeKey(...parts: string[]): string {
  return md5(parts.join('|'));
}
