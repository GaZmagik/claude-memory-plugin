/**
 * Test Helpers for Branded Types
 *
 * Provides convenient factory functions for creating branded IDs in tests.
 * These are shortcuts around unsafeAs* functions for test readability.
 */

import {
  type MemoryId,
  type ThinkId,
  type SessionId,
  unsafeAsMemoryId,
  unsafeAsThinkId,
  unsafeAsSessionId,
} from '../types/branded.js';

/**
 * Create a MemoryId from a string literal in tests
 * @example
 * const id = memoryId('decision-test');
 */
export function memoryId(id: string): MemoryId {
  return unsafeAsMemoryId(id);
}

/**
 * Create a ThinkId from a string literal in tests
 * @example
 * const id = thinkId('thought-20260118-143052');
 */
export function thinkId(id: string): ThinkId {
  return unsafeAsThinkId(id);
}

/**
 * Create a SessionId from a string literal in tests
 * @example
 * const id = sessionId('session-123');
 */
export function sessionId(id: string): SessionId {
  return unsafeAsSessionId(id);
}

/**
 * Create an array of MemoryIds from string literals in tests
 * @example
 * const ids = memoryIds(['decision-a', 'decision-b']);
 */
export function memoryIds(ids: string[]): MemoryId[] {
  return ids.map(unsafeAsMemoryId);
}

/**
 * Create an array of ThinkIds from string literals in tests
 * @example
 * const ids = thinkIds(['thought-20260118-143052', 'thought-20260118-143053']);
 */
export function thinkIds(ids: string[]): ThinkId[] {
  return ids.map(unsafeAsThinkId);
}

// Re-export the types for convenience
export type { MemoryId, ThinkId, SessionId };
