/**
 * Think Document ID Generator
 *
 * Generates unique IDs for thinking documents in the format:
 * think-YYYYMMDD-HHMMSSmmm (with milliseconds to prevent same-second collisions)
 */

/**
 * Generate a think document ID with timestamp format
 * Format: think-YYYYMMDD-HHMMSSmmm (includes milliseconds)
 */
export function generateThinkId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const millis = String(now.getMilliseconds()).padStart(3, '0');

  return `think-${year}${month}${day}-${hours}${minutes}${seconds}${millis}`;
}

/**
 * Validate a think document ID format
 * @param id - The ID to validate
 * @returns true if the ID matches think-YYYYMMDD-HHMMSS or think-YYYYMMDD-HHMMSSmmm format
 */
export function isValidThinkId(id: string): boolean {
  // Accept both old format (6 digits) and new format (9 digits with millis)
  return /^think-\d{8}-\d{6,9}$/.test(id);
}

/**
 * Extract the timestamp from a think document ID
 * @param id - The think document ID
 * @returns Date object or null if invalid
 */
export function parseThinkIdTimestamp(id: string): Date | null {
  if (!isValidThinkId(id)) {
    return null;
  }

  // Extract date parts from think-YYYYMMDD-HHMMSS or think-YYYYMMDD-HHMMSSmmm
  const match = id.match(/^think-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})(\d{3})?$/);
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
