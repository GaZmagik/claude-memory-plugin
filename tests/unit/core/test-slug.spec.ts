/**
 * T011: Unit test for slug generation
 *
 * Tests the slug generation algorithm that converts titles to URL-safe identifiers.
 */

import { describe, it, expect } from 'vitest';
import { generateSlug, detectCollision, resolveCollision } from '../../../skills/memory/src/core/slug.js';

describe('generateSlug', () => {
  it('should convert title to lowercase kebab-case', () => {
    expect(generateSlug('My Memory Title')).toBe('my-memory-title');
  });

  it('should remove special characters', () => {
    expect(generateSlug('Title with @#$% symbols!')).toBe('title-with-symbols');
  });

  it('should handle apostrophes and quotes', () => {
    expect(generateSlug("It's a test")).toBe('its-a-test');
    expect(generateSlug('"Quoted" title')).toBe('quoted-title');
  });

  it('should collapse multiple hyphens', () => {
    expect(generateSlug('Title   with   spaces')).toBe('title-with-spaces');
    expect(generateSlug('Title---with---dashes')).toBe('title-with-dashes');
  });

  it('should trim leading and trailing hyphens', () => {
    expect(generateSlug('  Padded Title  ')).toBe('padded-title');
    expect(generateSlug('---Leading---')).toBe('leading');
  });

  it('should preserve numbers', () => {
    expect(generateSlug('Version 2.0 Release')).toBe('version-20-release');
  });

  it('should handle empty or whitespace-only input', () => {
    expect(generateSlug('')).toBe('untitled');
    expect(generateSlug('   ')).toBe('untitled');
  });

  it('should prefix with memory type when provided', () => {
    expect(generateSlug('OAuth Implementation', 'decision')).toBe('decision-oauth-implementation');
    expect(generateSlug('Token Refresh', 'learning')).toBe('learning-token-refresh');
  });

  it('should handle unicode characters', () => {
    expect(generateSlug('Café résumé')).toBe('cafe-resume');
  });

  it('should truncate very long slugs', () => {
    const longTitle = 'This is a very long title that exceeds the maximum length allowed for slugs in the memory system';
    const slug = generateSlug(longTitle);
    expect(slug.length).toBeLessThanOrEqual(80);
  });
});

describe('detectCollision', () => {
  it('should return false when no existing slugs', () => {
    expect(detectCollision('my-slug', [])).toBe(false);
  });

  it('should return true when exact match exists', () => {
    expect(detectCollision('my-slug', ['my-slug', 'other-slug'])).toBe(true);
  });

  it('should return false when no match', () => {
    expect(detectCollision('my-slug', ['other-slug', 'another-slug'])).toBe(false);
  });
});

describe('resolveCollision', () => {
  it('should append -1 for first collision', () => {
    expect(resolveCollision('my-slug', ['my-slug'])).toBe('my-slug-1');
  });

  it('should increment suffix for subsequent collisions', () => {
    expect(resolveCollision('my-slug', ['my-slug', 'my-slug-1'])).toBe('my-slug-2');
    expect(resolveCollision('my-slug', ['my-slug', 'my-slug-1', 'my-slug-2'])).toBe('my-slug-3');
  });

  it('should handle gaps in numbering', () => {
    expect(resolveCollision('my-slug', ['my-slug', 'my-slug-2'])).toBe('my-slug-1');
  });

  it('should return original if no collision', () => {
    expect(resolveCollision('my-slug', ['other-slug'])).toBe('my-slug');
  });
});
