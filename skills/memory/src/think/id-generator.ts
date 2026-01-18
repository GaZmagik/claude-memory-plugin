/**
 * Think Document ID Generator
 *
 * Generates unique IDs for thinking documents in the format:
 * thought-YYYYMMDD-HHMMSSmmm (with milliseconds to prevent same-second collisions)
 *
 * Note: The CLI command remains `memory think` but generated IDs use `thought-` prefix
 * for visual consistency with thought.json state file.
 */

import type { ThinkId } from '../types/branded.js';

/**
 * Generate a think document ID with timestamp format
 * Format: thought-YYYYMMDD-HHMMSSmmm (includes milliseconds)
 */
export function generateThinkId(): ThinkId {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const millis = String(now.getMilliseconds()).padStart(3, '0');

  return `thought-${year}${month}${day}-${hours}${minutes}${seconds}${millis}` as ThinkId;
}

/**
 * Validate a think document ID format (type guard)
 * @param id - The ID to validate
 * @returns true if the ID matches thought-YYYYMMDD-HHMMSS or thought-YYYYMMDD-HHMMSSmmm format
 *          Also accepts legacy think- prefix for backwards compatibility
 */
export function isValidThinkId(id: string): id is ThinkId {
  // Accept both thought- (new) and think- (legacy) prefixes
  // Accept both old format (6 digits) and new format (9 digits with millis)
  return /^(thought|think)-\d{8}-\d{6,9}$/.test(id);
}

/**
 * Extract the timestamp from a think document ID
 * @param id - The think document ID
 * @returns Date object or null if invalid
 */
export function parseThinkIdTimestamp(id: ThinkId | string): Date | null {
  if (!isValidThinkId(id)) {
    return null;
  }

  // Extract date parts from thought-YYYYMMDD-HHMMSS or thought-YYYYMMDD-HHMMSSmmm
  // Also handles legacy think- prefix
  const match = id.match(/^(?:thought|think)-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})(\d{3})?$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hours, minutes, seconds, millis] = match;
  const date = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1, // Month is 0-indexed
    parseInt(day, 10),
    parseInt(hours, 10),
    parseInt(minutes, 10),
    parseInt(seconds, 10)
  );

  // Add milliseconds if present
  if (millis) {
    date.setMilliseconds(parseInt(millis, 10));
  }

  return date;
}
