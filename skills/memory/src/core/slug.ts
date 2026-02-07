/**
 * T024: Slug Generation
 *
 * Generates URL-safe slugs from titles with collision detection.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MemoryId } from '../types/branded.js';
import { MemoryType } from '../types/enums.js';

const MAX_SLUG_LENGTH = 80;

/**
 * Convert a title to a URL-safe slug.
 *
 * Transforms the input string by:
 * - Converting to lowercase
 * - Normalising and removing diacritical marks (e.g., é → e)
 * - Removing non-alphanumeric characters except spaces and hyphens
 * - Replacing spaces with hyphens
 * - Collapsing multiple consecutive hyphens into one
 * - Trimming leading and trailing hyphens
 *
 * @param title - The title string to convert to a slug
 * @returns A URL-safe slug string containing only lowercase letters, numbers, and hyphens
 *
 * @example
 * ```typescript
 * slugify('Hello World!'); // Returns 'hello-world'
 * slugify('Café Résumé'); // Returns 'cafe-resume'
 * slugify('Multiple   Spaces'); // Returns 'multiple-spaces'
 * slugify('--leading-trailing--'); // Returns 'leading-trailing'
 * ```
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a slug from a title, optionally prefixed with a memory type.
 *
 * This is the primary test-facing API for slug generation. It handles
 * empty titles by returning 'untitled' (with optional type prefix),
 * and truncates long slugs to the maximum allowed length (80 characters).
 *
 * @param title - The title string to convert to a slug
 * @param type - Optional memory type prefix (e.g., 'learning', 'gotcha')
 * @returns A URL-safe slug, optionally prefixed with the type
 *
 * @example
 * ```typescript
 * generateSlug('My Learning'); // Returns 'my-learning'
 * generateSlug('My Learning', 'learning'); // Returns 'learning-my-learning'
 * generateSlug('', 'gotcha'); // Returns 'gotcha-untitled'
 * generateSlug('   '); // Returns 'untitled'
 * ```
 */
export function generateSlug(title: string, type?: string): string {
  const trimmed = title.trim();

  if (!trimmed) {
    return type ? `${type}-untitled` : 'untitled';
  }

  let slug = slugify(trimmed);

  // Truncate if too long
  if (slug.length > MAX_SLUG_LENGTH) {
    slug = slug.slice(0, MAX_SLUG_LENGTH).replace(/-$/, '');
  }

  if (type) {
    return `${type}-${slug}`;
  }

  return slug;
}

/**
 * Detect if a slug collides with any existing slugs.
 *
 * Performs a simple inclusion check against an array of existing slugs
 * to determine if the provided slug would cause a naming conflict.
 *
 * @param slug - The slug to check for collisions
 * @param existingSlugs - Array of existing slugs to check against
 * @returns `true` if the slug exists in the array, `false` otherwise
 *
 * @example
 * ```typescript
 * const existing = ['my-memory', 'another-memory'];
 * detectCollision('my-memory', existing); // Returns true
 * detectCollision('new-memory', existing); // Returns false
 * ```
 */
export function detectCollision(slug: string, existingSlugs: string[]): boolean {
  return existingSlugs.includes(slug);
}

/**
 * Resolve a slug collision by appending a numeric suffix.
 *
 * If the slug already exists in the provided array, appends an incrementing
 * numeric suffix (e.g., '-1', '-2', '-3') until a unique slug is found.
 * If no collision exists, returns the original slug unchanged.
 *
 * @param slug - The base slug that may need collision resolution
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug, either the original or with a numeric suffix appended
 *
 * @example
 * ```typescript
 * const existing = ['my-memory', 'my-memory-1', 'my-memory-2'];
 * resolveCollision('my-memory', existing); // Returns 'my-memory-3'
 * resolveCollision('new-memory', existing); // Returns 'new-memory'
 * resolveCollision('my-memory', []); // Returns 'my-memory'
 * ```
 */
export function resolveCollision(slug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(slug)) {
    return slug;
  }

  let suffix = 1;
  let candidate = `${slug}-${suffix}`;

  while (existingSlugs.includes(candidate)) {
    suffix++;
    candidate = `${slug}-${suffix}`;
  }

  return candidate;
}

/**
 * Strip a type prefix from a title if present to prevent duplication.
 *
 * When creating memory IDs, titles may already contain the type as a prefix
 * (e.g., 'gotcha-edge-case' or 'Gotcha: Edge Case'). This function detects
 * and removes such prefixes to avoid double-prefixing like 'gotcha-gotcha-edge-case'.
 *
 * The function slugifies the title first, then checks if it starts with
 * the expected type prefix. If so, it returns the slug with the prefix removed.
 *
 * @param title - The title that may contain a type prefix
 * @param type - The memory type to check for and strip
 * @returns The title with the type prefix stripped if present, or the original title
 *
 * @example
 * ```typescript
 * stripTypePrefix('gotcha-edge-case', MemoryType.GOTCHA); // Returns 'edge-case'
 * stripTypePrefix('Gotcha: Edge Case', MemoryType.GOTCHA); // Returns 'edge-case'
 * stripTypePrefix('edge-case', MemoryType.GOTCHA); // Returns 'edge-case' (unchanged)
 * stripTypePrefix('gotcha', MemoryType.GOTCHA); // Returns 'gotcha' (would leave empty)
 * ```
 */
export function stripTypePrefix(title: string, type: MemoryType): string {
  const slugified = slugify(title);
  const expectedPrefix = `${type}-`;

  // Check if slugified title starts with the type prefix
  if (slugified.startsWith(expectedPrefix)) {
    const strippedSlug = slugified.slice(expectedPrefix.length);

    // Edge case: if stripping leaves nothing, return original
    if (!strippedSlug || strippedSlug.trim() === '') {
      return title;
    }

    return strippedSlug;
  }

  return title;
}

/**
 * Generate a memory ID from a type and title.
 *
 * Creates a branded `MemoryId` by combining the memory type with a slugified
 * version of the title. Automatically strips any existing type prefix from
 * the title to prevent duplication.
 *
 * @param type - The memory type (e.g., MemoryType.LEARNING, MemoryType.GOTCHA)
 * @param title - The title to convert into the slug portion of the ID
 * @returns A branded MemoryId in the format 'type-slug'
 *
 * @example
 * ```typescript
 * generateId(MemoryType.LEARNING, 'TypeScript Generics');
 * // Returns 'learning-typescript-generics' as MemoryId
 *
 * generateId(MemoryType.GOTCHA, 'gotcha-null-checks');
 * // Returns 'gotcha-null-checks' as MemoryId (no double prefix)
 * ```
 */
export function generateId(type: MemoryType, title: string): MemoryId {
  const sanitised = stripTypePrefix(title, type);
  const slug = slugify(sanitised);
  return `${type}-${slug}` as MemoryId;
}

/**
 * Check if a file with the given ID already exists in the specified directory.
 *
 * Constructs the expected file path by joining the base path with the ID
 * and a '.md' extension, then checks for file existence.
 *
 * @param id - The memory ID to check for existence
 * @param basePath - The base directory path where memory files are stored
 * @returns `true` if a file with this ID exists, `false` otherwise
 *
 * @example
 * ```typescript
 * idExists('learning-typescript', '/path/to/memories/permanent');
 * // Checks for /path/to/memories/permanent/learning-typescript.md
 * ```
 */
export function idExists(id: string, basePath: string): boolean {
  const filePath = path.join(basePath, `${id}.md`);
  return fs.existsSync(filePath);
}

/**
 * Generate a unique memory ID with collision detection.
 *
 * Creates a memory ID from the type and title, then checks if a file with
 * that ID already exists in the specified directory. If a collision is
 * detected, appends an incrementing numeric suffix until a unique ID is found.
 *
 * @param type - The memory type (e.g., MemoryType.LEARNING, MemoryType.GOTCHA)
 * @param title - The title to convert into the slug portion of the ID
 * @param basePath - The base directory path where memory files are stored
 * @returns A unique branded MemoryId that does not conflict with existing files
 * @throws Error if more than 1000 collisions are detected (safety limit)
 *
 * @example
 * ```typescript
 * // If 'learning-typescript.md' already exists:
 * generateUniqueId(MemoryType.LEARNING, 'TypeScript', '/path/to/memories');
 * // Returns 'learning-typescript-1' as MemoryId
 *
 * // If 'learning-typescript.md' and 'learning-typescript-1.md' exist:
 * generateUniqueId(MemoryType.LEARNING, 'TypeScript', '/path/to/memories');
 * // Returns 'learning-typescript-2' as MemoryId
 * ```
 */
export function generateUniqueId(
  type: MemoryType,
  title: string,
  basePath: string
): MemoryId {
  const baseId = generateId(type, title);

  if (!idExists(baseId, basePath)) {
    return baseId;
  }

  // Find next available suffix
  let suffix = 1;
  let uniqueId = `${baseId}-${suffix}` as MemoryId;

  while (idExists(uniqueId, basePath)) {
    suffix++;
    uniqueId = `${baseId}-${suffix}` as MemoryId;

    // Safety limit to prevent infinite loop
    if (suffix > 1000) {
      throw new Error(`Too many collisions for ID: ${baseId}`);
    }
  }

  return uniqueId;
}

/**
 * Validate that a slug meets the required format specifications.
 *
 * A valid slug must:
 * - Not be empty
 * - Contain only lowercase letters, numbers, and hyphens
 * - Not start or end with a hyphen
 * - Not contain consecutive hyphens
 *
 * @param slug - The slug string to validate
 * @returns `true` if the slug is valid, `false` otherwise
 *
 * @example
 * ```typescript
 * isValidSlug('my-valid-slug'); // Returns true
 * isValidSlug('slug123'); // Returns true
 * isValidSlug(''); // Returns false
 * isValidSlug('Invalid-Slug'); // Returns false (uppercase)
 * isValidSlug('-starts-with-hyphen'); // Returns false
 * isValidSlug('ends-with-hyphen-'); // Returns false
 * isValidSlug('double--hyphen'); // Returns false
 * isValidSlug('special@chars!'); // Returns false
 * ```
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length === 0) {
    return false;
  }

  // Must only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return false;
  }

  // Must not start or end with hyphen
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return false;
  }

  // Must not have consecutive hyphens
  if (/--/.test(slug)) {
    return false;
  }

  return true;
}

/**
 * Parse a memory ID into its type and slug components.
 *
 * Attempts to match the ID against known memory types. If a match is found,
 * returns an object containing the parsed type and the remaining slug portion.
 * Returns `null` if the ID does not match any known memory type prefix.
 *
 * @param id - The memory ID to parse (can be branded MemoryId or plain string)
 * @returns An object with `type` and `slug` properties, or `null` if parsing fails
 *
 * @example
 * ```typescript
 * parseId('learning-typescript-generics');
 * // Returns { type: MemoryType.LEARNING, slug: 'typescript-generics' }
 *
 * parseId('gotcha-null-checks-1');
 * // Returns { type: MemoryType.GOTCHA, slug: 'null-checks-1' }
 *
 * parseId('invalid-format');
 * // Returns null (no matching memory type)
 *
 * parseId('decision-use-vitest');
 * // Returns { type: MemoryType.DECISION, slug: 'use-vitest' }
 * ```
 */
export function parseId(id: MemoryId | string): { type: MemoryType; slug: string } | null {
  const types = Object.values(MemoryType);

  for (const type of types) {
    if (id.startsWith(`${type}-`)) {
      const slug = id.slice(type.length + 1);
      return { type, slug };
    }
  }

  return null;
}
