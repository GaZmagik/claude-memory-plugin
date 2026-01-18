/**
 * T033: Memory Validation
 *
 * Validation rules for memory entities.
 */

import { MemoryType, Scope, Severity } from '../types/enums.js';
import type { MemoryFrontmatter } from '../types/memory.js';
import type { WriteMemoryRequest, ExportPackage, ExportedMemory } from '../types/api.js';

/**
 * Validation error with field context
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a memory type
 */
export function isValidMemoryType(type: unknown): type is MemoryType {
  return Object.values(MemoryType).includes(type as MemoryType);
}

/**
 * Validate a scope
 */
export function isValidScope(scope: unknown): scope is Scope {
  return Object.values(Scope).includes(scope as Scope);
}

/**
 * Validate a severity level
 */
export function isValidSeverity(severity: unknown): severity is Severity {
  return Object.values(Severity).includes(severity as Severity);
}

/**
 * Validate a title
 */
export function isValidTitle(title: unknown): title is string {
  return typeof title === 'string' && title.trim().length > 0;
}

/**
 * Validate tags array
 */
export function isValidTags(tags: unknown): tags is string[] {
  if (!Array.isArray(tags)) {
    return false;
  }
  return tags.every(tag => typeof tag === 'string' && tag.trim().length > 0);
}

/**
 * Validate an ISO 8601 timestamp
 */
export function isValidTimestamp(timestamp: unknown): timestamp is string {
  if (typeof timestamp !== 'string') {
    return false;
  }
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Validate a memory ID format
 */
export function isValidMemoryId(id: unknown): id is string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    return false;
  }
  // ID should start with a valid type prefix
  const types = Object.values(MemoryType);
  return types.some(type => id.startsWith(`${type}-`));
}

/**
 * Validate links array
 */
export function isValidLinks(links: unknown): links is string[] {
  if (!Array.isArray(links)) {
    return false;
  }
  return links.every(link => typeof link === 'string' && link.trim().length > 0);
}

/**
 * Validate a WriteMemoryRequest
 */
export function validateWriteRequest(request: WriteMemoryRequest): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isValidTitle(request.title)) {
    errors.push({ field: 'title', message: 'title is required and must be a non-empty string' });
  }

  if (!isValidMemoryType(request.type)) {
    errors.push({ field: 'type', message: `type must be one of: ${Object.values(MemoryType).join(', ')}` });
  }

  if (typeof request.content !== 'string' || request.content.trim().length === 0) {
    errors.push({ field: 'content', message: 'content is required and must be a non-empty string' });
  }

  if (!isValidTags(request.tags)) {
    errors.push({ field: 'tags', message: 'tags must be an array of non-empty strings' });
  }

  if (!isValidScope(request.scope)) {
    errors.push({ field: 'scope', message: `scope must be one of: ${Object.values(Scope).join(', ')}` });
  }

  if (request.severity !== undefined && !isValidSeverity(request.severity)) {
    errors.push({ field: 'severity', message: `severity must be one of: ${Object.values(Severity).join(', ')}` });
  }

  if (request.links !== undefined && !isValidLinks(request.links)) {
    errors.push({ field: 'links', message: 'links must be an array of non-empty strings' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate frontmatter structure
 */
export function validateFrontmatter(frontmatter: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!frontmatter || typeof frontmatter !== 'object') {
    return { valid: false, errors: [{ field: 'frontmatter', message: 'frontmatter must be an object' }] };
  }

  const fm = frontmatter as Record<string, unknown>;

  if (!isValidMemoryType(fm.type)) {
    errors.push({ field: 'type', message: `type must be one of: ${Object.values(MemoryType).join(', ')}` });
  }

  if (!isValidTitle(fm.title)) {
    errors.push({ field: 'title', message: 'title is required and must be a non-empty string' });
  }

  if (!isValidTimestamp(fm.created)) {
    errors.push({ field: 'created', message: 'created must be a valid ISO 8601 timestamp' });
  }

  if (!isValidTimestamp(fm.updated)) {
    errors.push({ field: 'updated', message: 'updated must be a valid ISO 8601 timestamp' });
  }

  if (!isValidTags(fm.tags)) {
    errors.push({ field: 'tags', message: 'tags must be an array of strings' });
  }

  if (fm.severity !== undefined && !isValidSeverity(fm.severity)) {
    errors.push({ field: 'severity', message: `severity must be one of: ${Object.values(Severity).join(', ')}` });
  }

  if (fm.links !== undefined && !isValidLinks(fm.links)) {
    errors.push({ field: 'links', message: 'links must be an array of strings' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a complete memory (frontmatter + content + id)
 */
export function validateMemory(
  id: string,
  frontmatter: MemoryFrontmatter,
  content: string
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isValidMemoryId(id)) {
    errors.push({ field: 'id', message: 'id must be a valid memory ID starting with a type prefix' });
  }

  const fmResult = validateFrontmatter(frontmatter);
  errors.push(...fmResult.errors);

  if (typeof content !== 'string') {
    errors.push({ field: 'content', message: 'content must be a string' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Type guard: Validate that a value is a valid ExportedMemory
 */
export function isValidExportedMemory(value: unknown): value is ExportedMemory {
  if (!value || typeof value !== 'object') return false;
  const mem = value as Record<string, unknown>;

  if (typeof mem.id !== 'string' || mem.id.trim().length === 0) return false;
  if (typeof mem.content !== 'string') return false;

  // Validate frontmatter
  if (!mem.frontmatter || typeof mem.frontmatter !== 'object') return false;
  const fm = mem.frontmatter as Record<string, unknown>;

  if (typeof fm.type !== 'string') return false;
  if (typeof fm.title !== 'string') return false;
  if (!Array.isArray(fm.tags)) return false;
  if (typeof fm.created !== 'string') return false;
  if (typeof fm.updated !== 'string') return false;

  return true;
}

/**
 * Type guard: Validate that a value is a valid ExportPackage
 */
export function isValidExportPackage(value: unknown): value is ExportPackage {
  if (!value || typeof value !== 'object') return false;
  const pkg = value as Record<string, unknown>;

  if (typeof pkg.version !== 'string') return false;
  if (typeof pkg.exportedAt !== 'string') return false;
  if (!Array.isArray(pkg.memories)) return false;

  // Validate each memory
  for (const memory of pkg.memories) {
    if (!isValidExportedMemory(memory)) return false;
  }

  // Validate graph if present
  if (pkg.graph !== undefined) {
    if (typeof pkg.graph !== 'object' || pkg.graph === null) return false;
    const graph = pkg.graph as Record<string, unknown>;

    if (!Array.isArray(graph.nodes)) return false;
    if (!Array.isArray(graph.edges)) return false;

    // Validate edges have required fields
    for (const edge of graph.edges) {
      if (!edge || typeof edge !== 'object') return false;
      const e = edge as Record<string, unknown>;
      if (typeof e.source !== 'string') return false;
      if (typeof e.target !== 'string') return false;
      if (typeof e.label !== 'string') return false;
    }
  }

  return true;
}
