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
 * Convert a title to a URL-safe slug
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
 * Generate a slug from a title, optionally prefixed with memory type
 * This is the test-facing API
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
 * Detect if a slug collides with existing slugs
 */
export function detectCollision(slug: string, existingSlugs: string[]): boolean {
  return existingSlugs.includes(slug);
}

/**
 * Resolve a slug collision by appending a numeric suffix
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
 * Strip type prefix from title if present to prevent duplication
 *
 * Examples:
 * - "gotcha-edge-case" + type=gotcha → "edge-case"
 * - "Gotcha: Edge Case" + type=gotcha → "edge-case"
 * - "edge-case" + type=gotcha → "edge-case" (unchanged)
 *
 * @param title - The title that may contain a type prefix
 * @param type - The memory type
 * @returns Title with type prefix stripped if present
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
 * Generate a memory ID from type and title
 */
export function generateId(type: MemoryType, title: string): MemoryId {
  const sanitised = stripTypePrefix(title, type);
  const slug = slugify(sanitised);
  return `${type}-${slug}` as MemoryId;
}

/**
 * Check if a file with this ID already exists
 */
export function idExists(id: string, basePath: string): boolean {
  const filePath = path.join(basePath, `${id}.md`);
  return fs.existsSync(filePath);
}

/**
 * Generate a unique ID with collision detection
 * Appends numeric suffix if ID already exists
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
 * Validate that a slug meets requirements
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
 * Parse a memory ID into type and slug components
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
