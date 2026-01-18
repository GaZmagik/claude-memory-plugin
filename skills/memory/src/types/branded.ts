/**
 * Branded Types for Memory Plugin IDs
 *
 * Uses TypeScript branded types (also known as nominal types or opaque types)
 * to prevent mixing different ID types at compile time with zero runtime overhead.
 *
 * The unique symbol brand pattern ensures that:
 * - MemoryId, ThinkId, and SessionId are incompatible at compile time
 * - They serialize as plain strings in JSON (no runtime overhead)
 * - Type guards and unsafe casts provide controlled conversion
 */

// Unique symbol for branding - exists only at compile time
declare const __brand: unique symbol;

/**
 * Brand utility type - creates a nominal type from a base type
 * The brand only exists at compile time and has no runtime representation
 */
type Brand<T, B> = T & { readonly [__brand]: B };

// ============================================================================
// Branded ID Types
// ============================================================================

/**
 * Memory ID - identifies a memory document
 * Format: {type}-{slug} (e.g., "decision-use-typescript", "learning-tdd-patterns")
 */
export type MemoryId = Brand<string, 'MemoryId'>;

/**
 * Think ID - identifies a thinking/deliberation document
 * Format: thought-YYYYMMDD-HHMMSSmmm (e.g., "thought-20260118-143052123")
 */
export type ThinkId = Brand<string, 'ThinkId'>;

/**
 * Session ID - identifies a Claude session for --resume support
 * Format: UUID or similar unique identifier
 */
export type SessionId = Brand<string, 'SessionId'>;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a string is a valid MemoryId format
 * Format: {type}-{slug} where type is a known MemoryType
 */
export function isMemoryId(value: string): value is MemoryId {
  // Memory IDs start with known type prefixes
  const validPrefixes = [
    'decision-',
    'learning-',
    'artifact-',
    'gotcha-',
    'breadcrumb-',
    'hub-',
  ];
  return validPrefixes.some((prefix) => value.startsWith(prefix));
}

/**
 * Check if a string is a valid ThinkId format
 * Format: thought-YYYYMMDD-HHMMSS or thought-YYYYMMDD-HHMMSSmmm
 * Also accepts legacy think- prefix for backwards compatibility
 */
export function isThinkId(value: string): value is ThinkId {
  return /^(thought|think)-\d{8}-\d{6,9}$/.test(value);
}

/**
 * Check if a string is a valid SessionId format
 * Accepts UUIDs and Claude session ID formats
 */
export function isSessionId(value: string): value is SessionId {
  // UUID format or any non-empty string that looks like a session ID
  // Being permissive here since session IDs come from external sources
  return value.length > 0 && /^[a-zA-Z0-9_-]+$/.test(value);
}

// ============================================================================
// Unsafe Casts (for JSON boundaries and trusted sources)
// ============================================================================

/**
 * Cast a string to MemoryId without validation
 * Use at JSON parsing boundaries where you trust the source
 *
 * @example
 * const entry = JSON.parse(content) as { id: string };
 * const id = unsafeAsMemoryId(entry.id);
 */
export function unsafeAsMemoryId(value: string): MemoryId {
  return value as MemoryId;
}

/**
 * Cast a string to ThinkId without validation
 * Use at JSON parsing boundaries where you trust the source
 */
export function unsafeAsThinkId(value: string): ThinkId {
  return value as ThinkId;
}

/**
 * Cast a string to SessionId without validation
 * Use at JSON parsing boundaries where you trust the source
 */
export function unsafeAsSessionId(value: string): SessionId {
  return value as SessionId;
}

// ============================================================================
// Safe Casts (with validation)
// ============================================================================

/**
 * Parse a string as MemoryId, returning null if invalid
 */
export function parseMemoryId(value: string): MemoryId | null {
  return isMemoryId(value) ? value : null;
}

/**
 * Parse a string as ThinkId, returning null if invalid
 */
export function parseThinkId(value: string): ThinkId | null {
  return isThinkId(value) ? value : null;
}

/**
 * Parse a string as SessionId, returning null if invalid
 */
export function parseSessionId(value: string): SessionId | null {
  return isSessionId(value) ? value : null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract the raw string value from a branded ID
 * Useful when you need to pass to APIs that expect plain strings
 *
 * Note: This is mostly documentation - branded types ARE strings at runtime
 */
export function unwrapId<T extends MemoryId | ThinkId | SessionId>(
  id: T
): string {
  return id;
}

/**
 * Compare two IDs for equality
 * Works across branded types since they're all strings at runtime
 */
export function idsEqual(
  a: MemoryId | ThinkId | SessionId,
  b: MemoryId | ThinkId | SessionId
): boolean {
  return a === b;
}
