/**
 * T024: Slug Generation
 *
 * Generates URL-safe slugs from titles with collision detection.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
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
 * Generate a memory ID from type and title
 */
export function generateId(type: MemoryType, title: string): string {
  const slug = slugify(title);
  return `${type}-${slug}`;
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
): string {
  const baseId = generateId(type, title);

  if (!idExists(baseId, basePath)) {
    return baseId;
  }

  // Find next available suffix
  let suffix = 1;
  let uniqueId = `${baseId}-${suffix}`;

  while (idExists(uniqueId, basePath)) {
    suffix++;
    uniqueId = `${baseId}-${suffix}`;

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
export function parseId(id: string): { type: MemoryType; slug: string } | null {
  const types = Object.values(MemoryType);

  for (const type of types) {
    if (id.startsWith(`${type}-`)) {
      const slug = id.slice(type.length + 1);
      return { type, slug };
    }
  }

  return null;
}
