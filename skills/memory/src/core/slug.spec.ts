/**
 * T011: Unit test for slug generation
 *
 * Tests the slug generation algorithm that converts titles to URL-safe identifiers.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  generateSlug,
  detectCollision,
  resolveCollision,
  generateId,
  idExists,
  generateUniqueId,
  isValidSlug,
  parseId,
} from './slug.js';
import { MemoryType } from '../types/enums.js';

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

describe('generateId', () => {
  it('should generate ID from type and title', () => {
    expect(generateId(MemoryType.Decision, 'OAuth Implementation')).toBe(
      'decision-oauth-implementation'
    );
  });

  it('should handle different memory types', () => {
    expect(generateId(MemoryType.Learning, 'Test Title')).toBe('learning-test-title');
    expect(generateId(MemoryType.Artifact, 'Code Pattern')).toBe('artifact-code-pattern');
    expect(generateId(MemoryType.Gotcha, 'Watch Out')).toBe('gotcha-watch-out');
  });
});

describe('idExists', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slug-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should return true when file exists', () => {
    fs.writeFileSync(path.join(testDir, 'decision-test.md'), 'content');

    expect(idExists('decision-test', testDir)).toBe(true);
  });

  it('should return false when file does not exist', () => {
    expect(idExists('non-existent', testDir)).toBe(false);
  });
});

describe('generateUniqueId', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slug-unique-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should return base ID when no collision', () => {
    const id = generateUniqueId(MemoryType.Decision, 'Test', testDir);

    expect(id).toBe('decision-test');
  });

  it('should append suffix when collision exists', () => {
    fs.writeFileSync(path.join(testDir, 'decision-test.md'), 'content');

    const id = generateUniqueId(MemoryType.Decision, 'Test', testDir);

    expect(id).toBe('decision-test-1');
  });

  it('should increment suffix for multiple collisions', () => {
    fs.writeFileSync(path.join(testDir, 'decision-test.md'), 'content');
    fs.writeFileSync(path.join(testDir, 'decision-test-1.md'), 'content');
    fs.writeFileSync(path.join(testDir, 'decision-test-2.md'), 'content');

    const id = generateUniqueId(MemoryType.Decision, 'Test', testDir);

    expect(id).toBe('decision-test-3');
  });
});

describe('isValidSlug', () => {
  it('should return true for valid slug', () => {
    expect(isValidSlug('my-valid-slug')).toBe(true);
    expect(isValidSlug('test123')).toBe(true);
    expect(isValidSlug('a')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isValidSlug('')).toBe(false);
  });

  it('should return false for uppercase characters', () => {
    expect(isValidSlug('MySlug')).toBe(false);
  });

  it('should return false for special characters', () => {
    expect(isValidSlug('my_slug')).toBe(false);
    expect(isValidSlug('my.slug')).toBe(false);
    expect(isValidSlug('my slug')).toBe(false);
  });

  it('should return false for leading hyphen', () => {
    expect(isValidSlug('-my-slug')).toBe(false);
  });

  it('should return false for trailing hyphen', () => {
    expect(isValidSlug('my-slug-')).toBe(false);
  });

  it('should return false for consecutive hyphens', () => {
    expect(isValidSlug('my--slug')).toBe(false);
  });
});

describe('parseId', () => {
  it('should parse decision ID', () => {
    const result = parseId('decision-oauth-implementation');

    expect(result).toEqual({
      type: MemoryType.Decision,
      slug: 'oauth-implementation',
    });
  });

  it('should parse learning ID', () => {
    const result = parseId('learning-test-patterns');

    expect(result).toEqual({
      type: MemoryType.Learning,
      slug: 'test-patterns',
    });
  });

  it('should parse artifact ID', () => {
    const result = parseId('artifact-code-template');

    expect(result).toEqual({
      type: MemoryType.Artifact,
      slug: 'code-template',
    });
  });

  it('should parse gotcha ID', () => {
    const result = parseId('gotcha-watch-out');

    expect(result).toEqual({
      type: MemoryType.Gotcha,
      slug: 'watch-out',
    });
  });

  it('should return null for invalid ID format', () => {
    expect(parseId('invalid-format')).toBeNull();
    expect(parseId('random-string')).toBeNull();
    expect(parseId('')).toBeNull();
  });

  it('should handle ID with numeric suffix', () => {
    const result = parseId('decision-test-1');

    expect(result).toEqual({
      type: MemoryType.Decision,
      slug: 'test-1',
    });
  });
});
