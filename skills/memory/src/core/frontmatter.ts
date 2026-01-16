/**
 * T025: YAML Frontmatter Parser/Serialiser
 *
 * Parse and serialise YAML frontmatter for memory files.
 */

import * as yaml from 'js-yaml';
import type { MemoryFrontmatter } from '../types/memory.js';

/**
 * Parse result from full memory file
 */
export interface ParseResult {
  frontmatter: MemoryFrontmatter;
  content: string;
}

/**
 * Parse YAML string into frontmatter object
 * Validates required fields unless lenient mode is enabled
 *
 * Security: Uses JSON_SCHEMA for defence-in-depth - only allows
 * safe JSON-compatible types (strings, numbers, booleans, null, arrays, objects)
 *
 * @param yamlContent - The YAML content to parse
 * @param options - Parse options
 * @param options.lenient - Skip validation (for repair/migration use cases)
 */
export function parseFrontmatter(
  yamlContent: string,
  options?: { lenient?: boolean }
): MemoryFrontmatter {
  const parsed = yaml.load(yamlContent, { schema: yaml.JSON_SCHEMA }) as MemoryFrontmatter;

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid frontmatter: must be a YAML object');
  }

  // Skip validation in lenient mode (for repair/migration)
  if (options?.lenient) {
    return parsed;
  }

  // Validate required fields
  if (!parsed.type) {
    throw new Error('Invalid frontmatter: type is required');
  }
  if (!parsed.title) {
    throw new Error('Invalid frontmatter: title is required');
  }

  return parsed;
}

/**
 * Serialise frontmatter object to YAML string
 */
export function serialiseFrontmatter(frontmatter: MemoryFrontmatter): string {
  // Create a clean object without undefined values
  // Order: id, title, type, scope, project (for readability in YAML)
  const clean: Record<string, unknown> = {};

  if (frontmatter.id) {
    clean.id = frontmatter.id;
  }
  clean.title = frontmatter.title;
  clean.type = frontmatter.type;
  if (frontmatter.scope) {
    clean.scope = frontmatter.scope;
  }
  if (frontmatter.project) {
    clean.project = frontmatter.project;
  }
  clean.created = frontmatter.created;
  clean.updated = frontmatter.updated;
  clean.tags = frontmatter.tags;
  if (frontmatter.severity) {
    clean.severity = frontmatter.severity;
  }
  if (frontmatter.links && frontmatter.links.length > 0) {
    clean.links = frontmatter.links;
  }
  if (frontmatter.source) {
    clean.source = frontmatter.source;
  }
  if (frontmatter.meta && Object.keys(frontmatter.meta).length > 0) {
    clean.meta = frontmatter.meta;
  }

  return yaml.dump(clean, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
  });
}

/**
 * Parse a complete memory file into frontmatter and content
 */
export function parseMemoryFile(
  fileContent: string,
  options?: { lenient?: boolean }
): ParseResult {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = fileContent.match(frontmatterRegex);

  if (!match) {
    throw new Error('Invalid memory file format: missing frontmatter delimiters');
  }

  const [, yamlContent, bodyContent] = match;

  const frontmatter = parseFrontmatter(yamlContent, options);

  return {
    frontmatter,
    content: bodyContent.trim(),
  };
}

/**
 * Serialise frontmatter and content into a complete memory file
 */
export function serialiseMemoryFile(frontmatter: MemoryFrontmatter, content: string): string {
  const yamlContent = serialiseFrontmatter(frontmatter);
  return `---\n${yamlContent}---\n\n${content}\n`;
}

/**
 * Update frontmatter fields while preserving existing values
 */
export function updateFrontmatter(
  existing: MemoryFrontmatter,
  updates: Partial<MemoryFrontmatter>
): MemoryFrontmatter {
  return {
    ...existing,
    ...updates,
    updated: new Date().toISOString(),
  };
}

/**
 * Create new frontmatter from write request data
 */
export function createFrontmatter(params: {
  id?: string;
  type: MemoryFrontmatter['type'];
  title: string;
  tags: string[];
  scope?: MemoryFrontmatter['scope'];
  project?: string;
  severity?: MemoryFrontmatter['severity'];
  links?: string[];
  source?: string;
  meta?: Record<string, unknown>;
}): MemoryFrontmatter {
  const now = new Date().toISOString();

  const frontmatter: MemoryFrontmatter = {
    type: params.type,
    title: params.title,
    created: now,
    updated: now,
    tags: params.tags,
  };

  if (params.id) {
    frontmatter.id = params.id;
  }

  if (params.scope) {
    frontmatter.scope = params.scope;
  }

  if (params.project) {
    frontmatter.project = params.project;
  }

  if (params.severity) {
    frontmatter.severity = params.severity;
  }

  if (params.links && params.links.length > 0) {
    frontmatter.links = params.links;
  }

  if (params.source) {
    frontmatter.source = params.source;
  }

  if (params.meta && Object.keys(params.meta).length > 0) {
    frontmatter.meta = params.meta;
  }

  return frontmatter;
}

/**
 * Extract ID from frontmatter or generate from type and title
 */
export function extractId(frontmatter: MemoryFrontmatter): string | null {
  // Check if ID is in meta
  if (frontmatter.meta && typeof frontmatter.meta.id === 'string') {
    return frontmatter.meta.id;
  }
  return null;
}

/**
 * Validate frontmatter has required fields
 */
export function hasRequiredFields(frontmatter: unknown): frontmatter is MemoryFrontmatter {
  if (!frontmatter || typeof frontmatter !== 'object') {
    return false;
  }

  const fm = frontmatter as Record<string, unknown>;

  return (
    typeof fm.type === 'string' &&
    typeof fm.title === 'string' &&
    typeof fm.created === 'string' &&
    typeof fm.updated === 'string' &&
    Array.isArray(fm.tags)
  );
}
