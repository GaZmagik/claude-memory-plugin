/**
 * T025: YAML Frontmatter Parser/Serialiser
 *
 * Parse and serialise YAML frontmatter for memory files.
 */

import * as yaml from 'js-yaml';
import type { MemoryId } from '../types/branded.js';
import type { MemoryFrontmatter } from '../types/memory.js';

/**
 * Parse result from full memory file
 */
export interface ParseResult {
  frontmatter: MemoryFrontmatter;
  content: string;
}

/**
 * Parses a YAML string into a validated MemoryFrontmatter object.
 *
 * This function uses the JSON_SCHEMA for defence-in-depth security,
 * allowing only safe JSON-compatible types (strings, numbers, booleans,
 * null, arrays, objects). By default, it validates that required fields
 * (type and title) are present.
 *
 * @param yamlContent - The raw YAML string to parse
 * @param options - Optional configuration for parsing behaviour
 * @param options.lenient - When true, skips validation of required fields.
 *   Useful for repair or migration scenarios where partial data is acceptable.
 * @returns The parsed frontmatter object with all metadata fields
 * @throws {Error} When the YAML content is not a valid object
 * @throws {Error} When required field 'type' is missing (unless lenient mode)
 * @throws {Error} When required field 'title' is missing (unless lenient mode)
 *
 * @example
 * // Parse valid frontmatter
 * const yaml = `
 * type: learning
 * title: TypeScript Generics
 * created: 2026-02-07T10:00:00Z
 * updated: 2026-02-07T10:00:00Z
 * tags:
 *   - typescript
 *   - generics
 * `;
 * const frontmatter = parseFrontmatter(yaml);
 * console.log(frontmatter.type); // 'learning'
 *
 * @example
 * // Parse with lenient mode for migration
 * const incompleteYaml = `title: Partial Memory`;
 * const frontmatter = parseFrontmatter(incompleteYaml, { lenient: true });
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
 * Serialises a MemoryFrontmatter object into a YAML string.
 *
 * The output YAML is formatted for optimal readability with fields
 * ordered as: id, title, type, scope, agent, project, created, updated,
 * tags, severity, links, source, meta. Undefined or empty optional
 * fields are omitted from the output.
 *
 * @param frontmatter - The frontmatter object to serialise
 * @returns A formatted YAML string representation of the frontmatter
 *
 * @example
 * const frontmatter: MemoryFrontmatter = {
 *   type: 'decision',
 *   title: 'Use TypeScript strict mode',
 *   created: '2026-02-07T10:00:00Z',
 *   updated: '2026-02-07T10:00:00Z',
 *   tags: ['typescript', 'configuration'],
 * };
 * const yaml = serialiseFrontmatter(frontmatter);
 * // Output:
 * // title: Use TypeScript strict mode
 * // type: decision
 * // created: "2026-02-07T10:00:00Z"
 * // ...
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
  if (frontmatter.agent) {
    clean.agent = frontmatter.agent;
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
 * Parses a complete memory file into its frontmatter and content components.
 *
 * Memory files follow a specific format with YAML frontmatter delimited
 * by triple dashes (---) followed by markdown content. This function
 * extracts and parses both sections.
 *
 * @param fileContent - The complete file content including frontmatter delimiters
 * @param options - Optional configuration for parsing behaviour
 * @param options.lenient - When true, skips validation of required frontmatter fields
 * @returns An object containing the parsed frontmatter and the trimmed content body
 * @throws {Error} When the file does not have valid frontmatter delimiters (--- ... ---)
 * @throws {Error} When the frontmatter YAML is invalid (propagated from parseFrontmatter)
 *
 * @example
 * const fileContent = `---
 * type: gotcha
 * title: Async/Await in loops
 * created: 2026-02-07T10:00:00Z
 * updated: 2026-02-07T10:00:00Z
 * tags:
 *   - javascript
 *   - async
 * ---
 *
 * Using forEach with async/await does not work as expected.
 * Use for...of loops instead.
 * `;
 *
 * const { frontmatter, content } = parseMemoryFile(fileContent);
 * console.log(frontmatter.title); // 'Async/Await in loops'
 * console.log(content); // 'Using forEach with async/await...'
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

  const frontmatter = parseFrontmatter(yamlContent!, options);

  return {
    frontmatter,
    content: bodyContent!.trim(),
  };
}

/**
 * Serialises frontmatter and content into a complete memory file string.
 *
 * Creates a properly formatted memory file with YAML frontmatter
 * wrapped in triple-dash delimiters, followed by a blank line
 * and the markdown content body.
 *
 * @param frontmatter - The frontmatter metadata object to serialise
 * @param content - The markdown content body of the memory
 * @returns A complete memory file string ready to be written to disk
 *
 * @example
 * const frontmatter: MemoryFrontmatter = {
 *   type: 'learning',
 *   title: 'Git rebase vs merge',
 *   created: '2026-02-07T10:00:00Z',
 *   updated: '2026-02-07T10:00:00Z',
 *   tags: ['git', 'version-control'],
 * };
 * const content = 'Use rebase for feature branches, merge for shared branches.';
 *
 * const fileContent = serialiseMemoryFile(frontmatter, content);
 * // Result:
 * // ---
 * // title: Git rebase vs merge
 * // type: learning
 * // ...
 * // ---
 * //
 * // Use rebase for feature branches, merge for shared branches.
 */
export function serialiseMemoryFile(frontmatter: MemoryFrontmatter, content: string): string {
  const yamlContent = serialiseFrontmatter(frontmatter);
  return `---\n${yamlContent}---\n\n${content}\n`;
}

/**
 * Updates frontmatter fields while preserving existing values.
 *
 * Merges the provided updates with existing frontmatter, automatically
 * updating the 'updated' timestamp to the current ISO date/time.
 * Existing fields not specified in updates are preserved.
 *
 * @param existing - The current frontmatter object to update
 * @param updates - Partial frontmatter with fields to update or add
 * @returns A new frontmatter object with merged values and updated timestamp
 *
 * @example
 * const existing: MemoryFrontmatter = {
 *   type: 'learning',
 *   title: 'Original Title',
 *   created: '2026-02-01T10:00:00Z',
 *   updated: '2026-02-01T10:00:00Z',
 *   tags: ['typescript'],
 * };
 *
 * const updated = updateFrontmatter(existing, {
 *   title: 'Updated Title',
 *   tags: ['typescript', 'advanced'],
 * });
 *
 * console.log(updated.title); // 'Updated Title'
 * console.log(updated.created); // '2026-02-01T10:00:00Z' (preserved)
 * console.log(updated.updated); // '2026-02-07T...' (auto-updated)
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
 * Creates a new MemoryFrontmatter object from write request parameters.
 *
 * Constructs a complete frontmatter object with all required fields
 * and optional metadata. Timestamps default to the current time if
 * not provided. Optional fields are only included if they have values.
 *
 * @param params - The parameters for creating the frontmatter
 * @param params.id - Optional unique identifier for the memory
 * @param params.type - The memory type (learning, decision, gotcha, artifact, session)
 * @param params.title - The title/summary of the memory
 * @param params.tags - Array of categorisation tags
 * @param params.scope - Optional scope level (global, project, agent)
 * @param params.agent - Optional agent identifier for agent-scoped memories
 * @param params.project - Optional project identifier for project-scoped memories
 * @param params.severity - Optional severity level for gotchas (low, medium, high, critical)
 * @param params.links - Optional array of related memory IDs
 * @param params.source - Optional source file or context reference
 * @param params.meta - Optional arbitrary metadata object
 * @param params.created - Optional creation timestamp (defaults to now)
 * @param params.updated - Optional update timestamp (defaults to now)
 * @returns A complete MemoryFrontmatter object ready for serialisation
 *
 * @example
 * const frontmatter = createFrontmatter({
 *   type: 'gotcha',
 *   title: 'Circular dependency in module imports',
 *   tags: ['nodejs', 'modules', 'debugging'],
 *   severity: 'high',
 *   scope: 'project',
 *   project: 'my-api',
 *   source: 'src/services/auth.ts',
 * });
 *
 * console.log(frontmatter.type); // 'gotcha'
 * console.log(frontmatter.severity); // 'high'
 * console.log(frontmatter.created); // '2026-02-07T...' (auto-generated)
 */
export function createFrontmatter(params: {
  id?: MemoryId;
  type: MemoryFrontmatter['type'];
  title: string;
  tags: string[];
  scope?: MemoryFrontmatter['scope'];
  agent?: string;
  project?: string;
  severity?: MemoryFrontmatter['severity'];
  links?: MemoryId[];
  source?: string;
  meta?: Record<string, unknown>;
  created?: string;
  updated?: string;
}): MemoryFrontmatter {
  const now = new Date().toISOString();

  const frontmatter: MemoryFrontmatter = {
    type: params.type,
    title: params.title,
    created: params.created ?? now,
    updated: params.updated ?? now,
    tags: params.tags,
  };

  if (params.id) {
    frontmatter.id = params.id;
  }

  if (params.scope) {
    frontmatter.scope = params.scope;
  }

  if (params.agent) {
    frontmatter.agent = params.agent;
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
 * Extracts the memory ID from frontmatter metadata.
 *
 * Looks for an 'id' field within the frontmatter's meta object.
 * This is used for legacy or alternative ID storage patterns
 * where the ID may be stored in meta rather than as a top-level field.
 *
 * @param frontmatter - The frontmatter object to extract the ID from
 * @returns The ID string if found in meta, or null if not present
 *
 * @example
 * // Frontmatter with ID in meta
 * const frontmatter: MemoryFrontmatter = {
 *   type: 'learning',
 *   title: 'Example',
 *   created: '2026-02-07T10:00:00Z',
 *   updated: '2026-02-07T10:00:00Z',
 *   tags: [],
 *   meta: { id: 'learning-example-abc123' },
 * };
 *
 * const id = extractId(frontmatter);
 * console.log(id); // 'learning-example-abc123'
 *
 * @example
 * // Frontmatter without ID in meta
 * const frontmatter: MemoryFrontmatter = {
 *   type: 'learning',
 *   title: 'Example',
 *   created: '2026-02-07T10:00:00Z',
 *   updated: '2026-02-07T10:00:00Z',
 *   tags: [],
 * };
 *
 * const id = extractId(frontmatter);
 * console.log(id); // null
 */
export function extractId(frontmatter: MemoryFrontmatter): string | null {
  // Check if ID is in meta
  if (frontmatter.meta && typeof frontmatter.meta.id === 'string') {
    return frontmatter.meta.id;
  }
  return null;
}

/**
 * Type guard that validates whether an object has all required MemoryFrontmatter fields.
 *
 * Checks for the presence and correct types of all mandatory fields:
 * type (string), title (string), created (string), updated (string),
 * and tags (array). This is useful for runtime validation of parsed
 * data or unknown objects.
 *
 * @param frontmatter - The unknown value to validate
 * @returns True if the object has all required fields with correct types,
 *   narrowing the type to MemoryFrontmatter
 *
 * @example
 * // Validate parsed JSON data
 * const data: unknown = JSON.parse(jsonString);
 *
 * if (hasRequiredFields(data)) {
 *   // TypeScript now knows data is MemoryFrontmatter
 *   console.log(data.type);
 *   console.log(data.title);
 * } else {
 *   console.error('Invalid frontmatter structure');
 * }
 *
 * @example
 * // Use in array filtering
 * const items: unknown[] = [...];
 * const validFrontmatters = items.filter(hasRequiredFields);
 * // validFrontmatters is now MemoryFrontmatter[]
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
