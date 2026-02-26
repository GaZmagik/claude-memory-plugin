/**
 * T033: Memory Validation
 *
 * Validation rules for memory entities.
 */

import { MemoryType, Scope, Severity } from '../types/enums.js';
import type { MemoryFrontmatter } from '../types/memory.js';
import type { WriteMemoryRequest, ExportPackage, ExportedMemory } from '../types/api.js';
import { validateAgentName } from '../scope/validate-agent-name.js';

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
 * Validates that a value is a valid MemoryType enum member.
 *
 * This type guard checks if the provided value matches one of the defined
 * memory types: decision, learning, artifact, gotcha, breadcrumb, or hub.
 *
 * @param type - The value to validate as a MemoryType
 * @returns True if the value is a valid MemoryType, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidMemoryType } from './validation.js';
 * import { MemoryType } from '../types/enums.js';
 *
 * isValidMemoryType('decision');           // true
 * isValidMemoryType(MemoryType.Learning);  // true
 * isValidMemoryType('invalid');            // false
 * isValidMemoryType(null);                 // false
 * ```
 */
export function isValidMemoryType(type: unknown): type is MemoryType {
  return typeof type === 'string' && (Object.values(MemoryType) as string[]).includes(type);
}

/**
 * Validates that a value is a valid Scope enum member.
 *
 * This type guard checks if the provided value matches one of the defined
 * scopes: enterprise, local, project, global, agent-project, or agent-global.
 *
 * @param scope - The value to validate as a Scope
 * @returns True if the value is a valid Scope, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidScope } from './validation.js';
 * import { Scope } from '../types/enums.js';
 *
 * isValidScope('project');           // true
 * isValidScope(Scope.AgentProject);  // true
 * isValidScope('unknown');           // false
 * isValidScope(123);                 // false
 * ```
 */
export function isValidScope(scope: unknown): scope is Scope {
  return typeof scope === 'string' && (Object.values(Scope) as string[]).includes(scope);
}

/**
 * Validates that a value is a valid Severity enum member.
 *
 * This type guard checks if the provided value matches one of the defined
 * severity levels: low, medium, high, or critical.
 *
 * @param severity - The value to validate as a Severity
 * @returns True if the value is a valid Severity, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidSeverity } from './validation.js';
 * import { Severity } from '../types/enums.js';
 *
 * isValidSeverity('high');           // true
 * isValidSeverity(Severity.Critical); // true
 * isValidSeverity('urgent');          // false
 * isValidSeverity(undefined);         // false
 * ```
 */
export function isValidSeverity(severity: unknown): severity is Severity {
  return typeof severity === 'string' && (Object.values(Severity) as string[]).includes(severity);
}

/**
 * Validates that a value is a valid memory title.
 *
 * A valid title must be a non-empty string after trimming whitespace.
 * This ensures that memory entries have meaningful, displayable titles.
 *
 * @param title - The value to validate as a title
 * @returns True if the value is a non-empty string, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidTitle } from './validation.js';
 *
 * isValidTitle('My Decision');   // true
 * isValidTitle('  Valid  ');     // true (whitespace around is OK)
 * isValidTitle('');              // false
 * isValidTitle('   ');           // false (whitespace-only)
 * isValidTitle(null);            // false
 * isValidTitle(123);             // false
 * ```
 */
export function isValidTitle(title: unknown): title is string {
  return typeof title === 'string' && title.trim().length > 0;
}

/**
 * Validates that a value is a valid tags array.
 *
 * A valid tags array must be an array where every element is a non-empty
 * string after trimming. Empty arrays are considered valid.
 *
 * @param tags - The value to validate as a tags array
 * @returns True if the value is an array of non-empty strings, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidTags } from './validation.js';
 *
 * isValidTags(['typescript', 'testing']);  // true
 * isValidTags([]);                          // true (empty is valid)
 * isValidTags(['valid', '  spaced  ']);    // true
 * isValidTags(['valid', '']);              // false (empty string)
 * isValidTags(['valid', '   ']);           // false (whitespace-only)
 * isValidTags('not-an-array');             // false
 * isValidTags([123, 'mixed']);             // false (non-string element)
 * ```
 */
export function isValidTags(tags: unknown): tags is string[] {
  if (!Array.isArray(tags)) {
    return false;
  }
  return tags.every(tag => typeof tag === 'string' && tag.trim().length > 0);
}

/**
 * Validates that a value is a valid ISO 8601 timestamp.
 *
 * This function checks if the provided value is a string that can be
 * successfully parsed into a valid Date object. It accepts various
 * ISO 8601 formats including full datetime with timezone.
 *
 * @param timestamp - The value to validate as an ISO 8601 timestamp
 * @returns True if the value is a valid parseable timestamp string, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidTimestamp } from './validation.js';
 *
 * isValidTimestamp('2024-01-15T10:30:00Z');           // true
 * isValidTimestamp('2024-01-15T10:30:00.000Z');      // true
 * isValidTimestamp('2024-01-15');                    // true
 * isValidTimestamp('not-a-date');                    // false
 * isValidTimestamp('');                              // false
 * isValidTimestamp(Date.now());                      // false (number, not string)
 * isValidTimestamp(null);                            // false
 * ```
 */
export function isValidTimestamp(timestamp: unknown): timestamp is string {
  if (typeof timestamp !== 'string') {
    return false;
  }
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

/**
 * Validates that a value is a valid memory ID format.
 *
 * A valid memory ID must be a non-empty string that starts with a valid
 * memory type prefix followed by a hyphen (e.g., "decision-", "learning-").
 * The ID format is: `{type}-{slug}` where type is a MemoryType value.
 *
 * @param id - The value to validate as a memory ID
 * @returns True if the value is a valid memory ID format, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidMemoryId } from './validation.js';
 *
 * isValidMemoryId('decision-use-typescript');     // true
 * isValidMemoryId('learning-async-patterns');     // true
 * isValidMemoryId('gotcha-null-checks');          // true
 * isValidMemoryId('artifact-api-template');       // true
 * isValidMemoryId('invalid-prefix-here');         // false
 * isValidMemoryId('no-type-prefix');              // false
 * isValidMemoryId('');                            // false
 * isValidMemoryId(null);                          // false
 * ```
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
 * Validates that a value is a valid links array.
 *
 * A valid links array must be an array where every element is a non-empty
 * string after trimming. Links typically contain memory IDs that reference
 * related memories. Empty arrays are considered valid.
 *
 * @param links - The value to validate as a links array
 * @returns True if the value is an array of non-empty strings, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidLinks } from './validation.js';
 *
 * isValidLinks(['decision-use-typescript', 'learning-patterns']);  // true
 * isValidLinks([]);                                                  // true
 * isValidLinks(['single-link']);                                    // true
 * isValidLinks(['valid', '']);                                      // false
 * isValidLinks('not-an-array');                                     // false
 * isValidLinks([123]);                                              // false
 * isValidLinks(null);                                               // false
 * ```
 */
export function isValidLinks(links: unknown): links is string[] {
  if (!Array.isArray(links)) {
    return false;
  }
  return links.every(link => typeof link === 'string' && link.trim().length > 0);
}

/**
 * Validates a WriteMemoryRequest object for creating or updating a memory.
 *
 * This function performs comprehensive validation of all required and optional
 * fields in a write request. It checks:
 * - title: must be a non-empty string
 * - type: must be a valid MemoryType
 * - content: must be a non-empty string
 * - tags: must be an array of non-empty strings
 * - scope: must be a valid Scope
 * - severity (optional): must be a valid Severity if provided
 * - links (optional): must be an array of non-empty strings if provided
 *
 * @param request - The WriteMemoryRequest object to validate
 * @returns A ValidationResult containing valid status and any validation errors
 *
 * @example
 * ```typescript
 * import { validateWriteRequest } from './validation.js';
 * import { MemoryType, Scope } from '../types/enums.js';
 *
 * const request = {
 *   title: 'Use TypeScript strict mode',
 *   type: MemoryType.Decision,
 *   content: 'We decided to enable strict mode...',
 *   tags: ['typescript', 'configuration'],
 *   scope: Scope.Project
 * };
 *
 * const result = validateWriteRequest(request);
 * if (result.valid) {
 *   // Proceed with write operation
 * } else {
 *   console.error('Validation errors:', result.errors);
 *   // result.errors: [{ field: 'title', message: '...' }, ...]
 * }
 * ```
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
 * Validates a frontmatter object structure from a memory file.
 *
 * This function validates the YAML frontmatter structure of a memory file,
 * checking all required and optional fields. It performs validation for:
 * - type: must be a valid MemoryType
 * - title: must be a non-empty string
 * - created: must be a valid ISO 8601 timestamp
 * - updated: must be a valid ISO 8601 timestamp
 * - tags: must be an array of strings
 * - severity (optional): must be a valid Severity if provided
 * - links (optional): must be an array of strings if provided
 * - agent: required for agent scopes, validated against agent name format
 *
 * @param frontmatter - The frontmatter object to validate (typically parsed from YAML)
 * @returns A ValidationResult containing valid status and any validation errors
 * @throws Does not throw; all errors are captured in the ValidationResult
 *
 * @example
 * ```typescript
 * import { validateFrontmatter } from './validation.js';
 *
 * const frontmatter = {
 *   type: 'decision',
 *   title: 'Use TypeScript',
 *   created: '2024-01-15T10:00:00Z',
 *   updated: '2024-01-15T10:00:00Z',
 *   tags: ['typescript']
 * };
 *
 * const result = validateFrontmatter(frontmatter);
 * if (!result.valid) {
 *   console.error('Invalid frontmatter:', result.errors);
 * }
 *
 * // Agent-scoped frontmatter validation
 * const agentFrontmatter = {
 *   type: 'learning',
 *   title: 'Agent Learning',
 *   created: '2024-01-15T10:00:00Z',
 *   updated: '2024-01-15T10:00:00Z',
 *   tags: ['agent'],
 *   scope: 'agent-project',
 *   agent: 'code-reviewer'  // Required for agent scopes
 * };
 * ```
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

  // Agent field validation
  if (fm.scope !== undefined && isValidScope(fm.scope)) {
    const scope = fm.scope as Scope;

    // If scope is agent scope, agent field is required
    if (scope === Scope.AgentProject || scope === Scope.AgentGlobal) {
      if (!fm.agent || typeof fm.agent !== 'string') {
        errors.push({
          field: 'agent',
          message: 'agent field is required for agent scopes'
        });
      } else {
        // Validate agent name format
        const agentValidation = validateAgentName(fm.agent);
        if (!agentValidation.valid) {
          errors.push({
            field: 'agent',
            message: agentValidation.error || 'Invalid agent name'
          });
        }
      }
    }
  }

  // If agent field is provided (for any scope), validate it
  if (fm.agent !== undefined && typeof fm.agent === 'string' && fm.agent.length > 0) {
    const agentValidation = validateAgentName(fm.agent);
    if (!agentValidation.valid) {
      errors.push({
        field: 'agent',
        message: agentValidation.error || 'Invalid agent name'
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a complete memory entity including ID, frontmatter, and content.
 *
 * This function performs comprehensive validation of a memory entity by:
 * 1. Validating the memory ID format (must start with a valid type prefix)
 * 2. Validating all frontmatter fields via validateFrontmatter()
 * 3. Validating that content is a string
 *
 * This is typically used when loading memories from disk to ensure data integrity.
 *
 * @param id - The memory ID to validate
 * @param frontmatter - The parsed frontmatter object
 * @param content - The markdown content body
 * @returns A ValidationResult containing valid status and any validation errors
 *
 * @example
 * ```typescript
 * import { validateMemory } from './validation.js';
 * import { MemoryType } from '../types/enums.js';
 *
 * const id = 'decision-use-typescript';
 * const frontmatter = {
 *   type: MemoryType.Decision,
 *   title: 'Use TypeScript',
 *   created: '2024-01-15T10:00:00Z',
 *   updated: '2024-01-15T10:00:00Z',
 *   tags: ['typescript', 'tooling']
 * };
 * const content = '## Context\n\nWe needed to choose a language...';
 *
 * const result = validateMemory(id, frontmatter, content);
 * if (result.valid) {
 *   // Memory is valid and can be used
 * } else {
 *   console.error('Invalid memory:', result.errors);
 *   // Errors might include: id format, frontmatter issues, content type
 * }
 * ```
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
 * Type guard that validates a value is a valid ExportedMemory structure.
 *
 * An ExportedMemory must have:
 * - id: non-empty string
 * - content: string
 * - frontmatter: object containing type, title, tags (array), created, and updated
 *
 * This is used when importing memories to ensure the import data is valid
 * before attempting to write memories to disk.
 *
 * @param value - The value to validate as an ExportedMemory
 * @returns True if the value is a valid ExportedMemory structure, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidExportedMemory } from './validation.js';
 *
 * const memory = {
 *   id: 'decision-use-typescript',
 *   content: '## Context\n\nWe needed to choose...',
 *   frontmatter: {
 *     type: 'decision',
 *     title: 'Use TypeScript',
 *     tags: ['typescript'],
 *     created: '2024-01-15T10:00:00Z',
 *     updated: '2024-01-15T10:00:00Z'
 *   }
 * };
 *
 * if (isValidExportedMemory(memory)) {
 *   // TypeScript now knows memory is ExportedMemory
 *   console.log(memory.frontmatter.title);
 * }
 *
 * // Invalid examples
 * isValidExportedMemory({ id: '', content: '' });           // false (empty id)
 * isValidExportedMemory({ id: 'test' });                    // false (missing fields)
 * isValidExportedMemory(null);                              // false
 * ```
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
 * Type guard that validates a value is a valid ExportPackage structure.
 *
 * An ExportPackage must have:
 * - version: string (export format version)
 * - exportedAt: string (ISO 8601 timestamp)
 * - memories: array of valid ExportedMemory objects
 * - graph (optional): object with nodes and edges arrays, where edges have source, target, and label
 *
 * This is the top-level validation for import data, ensuring the entire
 * package structure is valid before processing individual memories.
 *
 * @param value - The value to validate as an ExportPackage
 * @returns True if the value is a valid ExportPackage structure, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidExportPackage } from './validation.js';
 * import * as fs from 'fs';
 *
 * // Validate imported JSON data
 * const rawData = fs.readFileSync('export.json', 'utf-8');
 * const parsed = JSON.parse(rawData);
 *
 * if (isValidExportPackage(parsed)) {
 *   // TypeScript now knows parsed is ExportPackage
 *   console.log(`Importing ${parsed.memories.length} memories`);
 *   console.log(`Export version: ${parsed.version}`);
 *
 *   if (parsed.graph) {
 *     console.log(`Graph has ${parsed.graph.edges.length} edges`);
 *   }
 * } else {
 *   console.error('Invalid export package format');
 * }
 *
 * // Valid package with graph
 * const pkg = {
 *   version: '1.0.0',
 *   exportedAt: '2024-01-15T10:00:00Z',
 *   memories: [{ id: 'decision-test', content: '', frontmatter: {...} }],
 *   graph: {
 *     nodes: [{ id: 'decision-test', type: 'decision' }],
 *     edges: [{ source: 'decision-test', target: 'learning-x', label: 'relates-to' }]
 *   }
 * };
 * isValidExportPackage(pkg);  // true
 * ```
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
