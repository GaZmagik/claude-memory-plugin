/**
 * Tests for Branded Type Test Helpers
 */

import { describe, it, expect } from 'vitest';
import {
  memoryId,
  thinkId,
  sessionId,
  memoryIds,
  thinkIds,
  type MemoryId,
  type ThinkId,
  type SessionId,
} from './branded-helpers.js';

describe('memoryId helper', () => {
  it('should create a MemoryId from a string', () => {
    const id: MemoryId = memoryId('decision-test');
    expect(id).toBe('decision-test');
  });

  it('should work with any memory type prefix', () => {
    expect(memoryId('learning-test')).toBe('learning-test');
    expect(memoryId('gotcha-test')).toBe('gotcha-test');
    expect(memoryId('artifact-test')).toBe('artifact-test');
  });
});

describe('thinkId helper', () => {
  it('should create a ThinkId from a string', () => {
    const id: ThinkId = thinkId('thought-20260118-143052');
    expect(id).toBe('thought-20260118-143052');
  });

  it('should work with legacy think- prefix', () => {
    const id: ThinkId = thinkId('think-20260118-143052');
    expect(id).toBe('think-20260118-143052');
  });
});

describe('sessionId helper', () => {
  it('should create a SessionId from a string', () => {
    const id: SessionId = sessionId('session-123');
    expect(id).toBe('session-123');
  });
});

describe('memoryIds helper', () => {
  it('should create an array of MemoryIds from strings', () => {
    const ids: MemoryId[] = memoryIds(['decision-a', 'decision-b', 'learning-c']);
    expect(ids).toEqual(['decision-a', 'decision-b', 'learning-c']);
    expect(ids).toHaveLength(3);
  });

  it('should return empty array for empty input', () => {
    expect(memoryIds([])).toEqual([]);
  });
});

describe('thinkIds helper', () => {
  it('should create an array of ThinkIds from strings', () => {
    const ids: ThinkId[] = thinkIds(['thought-20260118-143052', 'thought-20260118-143053']);
    expect(ids).toEqual(['thought-20260118-143052', 'thought-20260118-143053']);
    expect(ids).toHaveLength(2);
  });
});
