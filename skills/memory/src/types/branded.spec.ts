/**
 * Branded Types Tests
 *
 * Tests for the branded ID types and their associated type guards and casts.
 */

import { describe, it, expect } from 'vitest';
import {
  type MemoryId,
  type ThinkId,
  type SessionId,
  isMemoryId,
  isThinkId,
  isSessionId,
  unsafeAsMemoryId,
  unsafeAsThinkId,
  unsafeAsSessionId,
  parseMemoryId,
  parseThinkId,
  parseSessionId,
  unwrapId,
  idsEqual,
} from './branded.js';

describe('isMemoryId type guard', () => {
  it('should accept valid decision IDs', () => {
    expect(isMemoryId('decision-use-typescript')).toBe(true);
    expect(isMemoryId('decision-api-design-choices')).toBe(true);
  });

  it('should accept valid learning IDs', () => {
    expect(isMemoryId('learning-tdd-patterns')).toBe(true);
    expect(isMemoryId('learning-async-await-gotchas')).toBe(true);
  });

  it('should accept valid artifact IDs', () => {
    expect(isMemoryId('artifact-memory-schema')).toBe(true);
  });

  it('should accept valid gotcha IDs', () => {
    expect(isMemoryId('gotcha-null-pointer-edge-case')).toBe(true);
  });

  it('should accept valid breadcrumb IDs', () => {
    expect(isMemoryId('breadcrumb-investigating-bug')).toBe(true);
  });

  it('should accept valid hub IDs', () => {
    expect(isMemoryId('hub-authentication-system')).toBe(true);
  });

  it('should reject IDs with unknown prefixes', () => {
    expect(isMemoryId('unknown-some-id')).toBe(false);
    expect(isMemoryId('thought-20260118-143052')).toBe(false);
    expect(isMemoryId('random-string')).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(isMemoryId('')).toBe(false);
  });

  it('should reject strings without hyphen separator', () => {
    expect(isMemoryId('decision')).toBe(false);
    expect(isMemoryId('learning')).toBe(false);
  });
});

describe('isThinkId type guard', () => {
  it('should accept valid thought IDs with seconds', () => {
    expect(isThinkId('thought-20260118-143052')).toBe(true);
  });

  it('should accept valid thought IDs with milliseconds', () => {
    expect(isThinkId('thought-20260118-143052123')).toBe(true);
  });

  it('should accept legacy think- prefix IDs', () => {
    expect(isThinkId('think-20260118-143052')).toBe(true);
    expect(isThinkId('think-20260118-143052123')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(isThinkId('thought-2026-143052')).toBe(false);
    expect(isThinkId('thought-20260118-14305')).toBe(false);
    expect(isThinkId('decision-use-typescript')).toBe(false);
    expect(isThinkId('')).toBe(false);
  });

  it('should reject non-numeric date/time parts', () => {
    expect(isThinkId('thought-abcdefgh-ijklmn')).toBe(false);
  });
});

describe('isSessionId type guard', () => {
  it('should accept UUID-style session IDs', () => {
    expect(isSessionId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
  });

  it('should accept alphanumeric session IDs', () => {
    expect(isSessionId('session_abc123')).toBe(true);
    expect(isSessionId('claude-session-xyz')).toBe(true);
  });

  it('should reject empty strings', () => {
    expect(isSessionId('')).toBe(false);
  });

  it('should reject strings with invalid characters', () => {
    expect(isSessionId('session with spaces')).toBe(false);
    expect(isSessionId('session@invalid')).toBe(false);
  });
});

describe('unsafe cast functions', () => {
  it('unsafeAsMemoryId should cast strings to MemoryId', () => {
    const id: MemoryId = unsafeAsMemoryId('decision-test');
    expect(id).toBe('decision-test');
  });

  it('unsafeAsThinkId should cast strings to ThinkId', () => {
    const id: ThinkId = unsafeAsThinkId('thought-20260118-143052');
    expect(id).toBe('thought-20260118-143052');
  });

  it('unsafeAsSessionId should cast strings to SessionId', () => {
    const id: SessionId = unsafeAsSessionId('abc123');
    expect(id).toBe('abc123');
  });

  it('unsafe casts should work with any string (no validation)', () => {
    // These are intentionally invalid but should still cast
    const memoryId: MemoryId = unsafeAsMemoryId('not-a-valid-id');
    const thinkId: ThinkId = unsafeAsThinkId('invalid');
    const sessionId: SessionId = unsafeAsSessionId('');

    expect(memoryId).toBe('not-a-valid-id');
    expect(thinkId).toBe('invalid');
    expect(sessionId).toBe('');
  });
});

describe('parse functions (safe casts)', () => {
  it('parseMemoryId should return MemoryId for valid IDs', () => {
    const id = parseMemoryId('decision-test');
    expect(id).toBe('decision-test');
  });

  it('parseMemoryId should return null for invalid IDs', () => {
    expect(parseMemoryId('invalid-format')).toBeNull();
    expect(parseMemoryId('')).toBeNull();
  });

  it('parseThinkId should return ThinkId for valid IDs', () => {
    const id = parseThinkId('thought-20260118-143052');
    expect(id).toBe('thought-20260118-143052');
  });

  it('parseThinkId should return null for invalid IDs', () => {
    expect(parseThinkId('decision-test')).toBeNull();
    expect(parseThinkId('')).toBeNull();
  });

  it('parseSessionId should return SessionId for valid IDs', () => {
    const id = parseSessionId('session-123');
    expect(id).toBe('session-123');
  });

  it('parseSessionId should return null for invalid IDs', () => {
    expect(parseSessionId('')).toBeNull();
    expect(parseSessionId('invalid chars!')).toBeNull();
  });
});

describe('utility functions', () => {
  it('unwrapId should return the underlying string', () => {
    const memoryId = unsafeAsMemoryId('decision-test');
    const thinkId = unsafeAsThinkId('thought-20260118-143052');
    const sessionId = unsafeAsSessionId('session-123');

    expect(unwrapId(memoryId)).toBe('decision-test');
    expect(unwrapId(thinkId)).toBe('thought-20260118-143052');
    expect(unwrapId(sessionId)).toBe('session-123');
  });

  it('idsEqual should compare IDs correctly', () => {
    const id1 = unsafeAsMemoryId('decision-test');
    const id2 = unsafeAsMemoryId('decision-test');
    const id3 = unsafeAsMemoryId('decision-other');

    expect(idsEqual(id1, id2)).toBe(true);
    expect(idsEqual(id1, id3)).toBe(false);
  });

  it('idsEqual should work across different branded types', () => {
    // This tests that the comparison works even with different brands
    // (since they're all strings at runtime)
    const memoryId = unsafeAsMemoryId('same-value');
    const thinkId = unsafeAsThinkId('same-value');

    expect(idsEqual(memoryId, thinkId)).toBe(true);
  });
});

describe('JSON serialisation', () => {
  it('branded types should serialise as plain strings', () => {
    const memoryId = unsafeAsMemoryId('decision-test');
    const thinkId = unsafeAsThinkId('thought-20260118-143052');

    const obj = { memoryId, thinkId };
    const json = JSON.stringify(obj);
    const parsed = JSON.parse(json);

    expect(parsed.memoryId).toBe('decision-test');
    expect(parsed.thinkId).toBe('thought-20260118-143052');
  });

  it('branded types should round-trip through JSON', () => {
    const original = unsafeAsMemoryId('decision-round-trip-test');
    const json = JSON.stringify({ id: original });
    const parsed = JSON.parse(json) as { id: string };
    const restored = unsafeAsMemoryId(parsed.id);

    expect(restored).toBe(original);
  });
});

describe('type safety (compile-time tests documented)', () => {
  // These tests document the compile-time behaviour
  // The actual type checking happens at compile time, not runtime

  it('documents that branded types are strings at runtime', () => {
    const memoryId = unsafeAsMemoryId('decision-test');
    expect(typeof memoryId).toBe('string');
  });

  it('documents that type guards narrow types correctly', () => {
    const value = 'decision-test';
    if (isMemoryId(value)) {
      // At this point, TypeScript knows value is MemoryId
      const id: MemoryId = value;
      expect(id).toBe('decision-test');
    }
  });
});
