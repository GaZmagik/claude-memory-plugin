/**
 * Tests for Type Guards
 */

import { describe, it, expect } from 'vitest';
import { isGraphNode, isExternalNode, isIndexEntry } from './guards.js';
import { MemoryType } from './enums.js';
import type { GraphNode } from '../graph/structure.js';

describe('isGraphNode', () => {
  it('returns true for valid graph node', () => {
    expect(isGraphNode({ id: 'decision-foo', type: 'decision' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isGraphNode(null)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isGraphNode('string')).toBe(false);
    expect(isGraphNode(42)).toBe(false);
  });

  it('returns false when id is missing', () => {
    expect(isGraphNode({ type: 'decision' })).toBe(false);
  });

  it('returns false when type is missing', () => {
    expect(isGraphNode({ id: 'decision-foo' })).toBe(false);
  });

  it('returns false when id is not a string', () => {
    expect(isGraphNode({ id: 123, type: 'decision' })).toBe(false);
  });

  it('returns false when type is not a string', () => {
    expect(isGraphNode({ id: 'foo', type: 99 })).toBe(false);
  });
});

describe('isExternalNode', () => {
  const baseNode: GraphNode = { id: 'test-node', type: MemoryType.Decision };

  it('returns true for rule nodes', () => {
    expect(isExternalNode({ ...baseNode, type: MemoryType.Rule })).toBe(true);
  });

  it('returns true for reminder nodes', () => {
    expect(isExternalNode({ ...baseNode, type: MemoryType.Reminder })).toBe(true);
  });

  it('returns false for decision nodes', () => {
    expect(isExternalNode({ ...baseNode, type: MemoryType.Decision })).toBe(false);
  });

  it('returns false for learning nodes', () => {
    expect(isExternalNode({ ...baseNode, type: MemoryType.Learning })).toBe(false);
  });

  it('returns false for gotcha nodes', () => {
    expect(isExternalNode({ ...baseNode, type: MemoryType.Gotcha })).toBe(false);
  });
});

describe('isIndexEntry', () => {
  const validEntry = {
    id: 'decision-foo',
    type: 'decision',
    title: 'Some Decision',
    tags: ['important'],
  };

  it('returns true for valid index entry', () => {
    expect(isIndexEntry(validEntry)).toBe(true);
  });

  it('returns true for entry with empty tags array', () => {
    expect(isIndexEntry({ ...validEntry, tags: [] })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isIndexEntry(null)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isIndexEntry('string')).toBe(false);
  });

  it('returns false when id is missing', () => {
    const { id: _, ...rest } = validEntry;
    expect(isIndexEntry(rest)).toBe(false);
  });

  it('returns false when type is missing', () => {
    const { type: _, ...rest } = validEntry;
    expect(isIndexEntry(rest)).toBe(false);
  });

  it('returns false when title is missing', () => {
    const { title: _, ...rest } = validEntry;
    expect(isIndexEntry(rest)).toBe(false);
  });

  it('returns false when tags is missing', () => {
    const { tags: _, ...rest } = validEntry;
    expect(isIndexEntry(rest)).toBe(false);
  });

  it('returns false when tags is not an array', () => {
    expect(isIndexEntry({ ...validEntry, tags: 'important' })).toBe(false);
  });
});
