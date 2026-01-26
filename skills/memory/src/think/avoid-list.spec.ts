/**
 * Unit tests for avoid-list
 */
import { describe, it, expect } from 'vitest';
import { extractAvoidList, shouldAvoidStyle } from './avoid-list.js';

describe('extractAvoidList', () => {
  it('extracts unique styles from thoughts', () => {
    const thoughts = [
      { style: 'Devils-Advocate' },
      { style: 'Socratic' },
      { style: 'Devils-Advocate' },
    ];
    const result = extractAvoidList(thoughts);
    expect(result).toContain('Devils-Advocate');
    expect(result).toContain('Socratic');
    expect(result.length).toBe(2);
  });

  it('handles empty array', () => {
    expect(extractAvoidList([])).toEqual([]);
  });

  it('filters out undefined styles', () => {
    const thoughts = [{ style: 'Socratic' }, { style: undefined }, {}];
    const result = extractAvoidList(thoughts);
    expect(result).toEqual(['Socratic']);
  });
});

describe('shouldAvoidStyle', () => {
  it('returns true for styles in avoid list', () => {
    expect(shouldAvoidStyle('Devils-Advocate', ['Devils-Advocate', 'Socratic'])).toBe(true);
  });

  it('returns false for styles not in avoid list', () => {
    expect(shouldAvoidStyle('Concise', ['Devils-Advocate'])).toBe(false);
  });

  it('returns false for empty avoid list', () => {
    expect(shouldAvoidStyle('Devils-Advocate', [])).toBe(false);
  });
});
