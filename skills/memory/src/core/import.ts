/**
 * Import Operation
 *
 * Import memories from a portable format (JSON or YAML).
 * Uses js-yaml for robust YAML parsing with comprehensive validation.
 */

import yaml from 'js-yaml';
import type {
  ImportMemoriesRequest,
  ImportMemoriesResponse,
  ExportPackage,
} from '../types/api.js';
import { Scope } from '../types/enums.js';
import { findInIndex } from './index.js';
import { writeMemory } from './write.js';
import { createLogger } from './logger.js';
import { isValidExportPackage } from './validation.js';
import { linkMemories } from '../graph/link.js';

const log = createLogger('import');

/**
 * Sanitise an object to prevent prototype pollution
 */
function sanitiseObject<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const dangerous = ['__proto__', 'constructor', 'prototype'];

  if (Array.isArray(obj)) {
    return obj.map(item => sanitiseObject(item)) as T;
  }

  const result: Record<string, unknown> = Object.create(null);
  for (const key of Object.keys(obj as object)) {
    if (!dangerous.includes(key)) {
      result[key] = sanitiseObject((obj as Record<string, unknown>)[key]);
    }
  }

  return result as T;
}

/**
 * Import memories from an export package (JSON or YAML).
 *
 * Parses and validates the import data, then writes each memory to the target
 * scope. Supports three conflict resolution strategies:
 * - `skip`: Keep existing memories, skip imports that conflict
 * - `merge`: Update only if imported version is newer
 * - `replace`: Always overwrite existing memories
 *
 * Also restores graph relationships if the export package includes them.
 *
 * @param request - Import request containing the data and options
 * @param request.data - Pre-parsed {@link ExportPackage} object (optional)
 * @param request.raw - Raw JSON or YAML string to parse (optional, one of data/raw required)
 * @param request.basePath - Base path for memory storage (defaults to cwd)
 * @param request.targetScope - Scope to import into (overrides memory scopes)
 * @param request.agent - Agent name for agent-scoped imports
 * @param request.projectRoot - Project root for path resolution
 * @param request.globalRoot - Global root for path resolution
 * @param request.strategy - Conflict strategy: 'skip', 'merge', or 'replace' (default 'merge')
 * @param request.dryRun - If true, validate without writing (default false)
 *
 * @returns {Promise<ImportMemoriesResponse>} Response object containing:
 *   - `status`: 'success' or 'error'
 *   - `importedCount`: Number of memories successfully imported
 *   - `mergedCount`: Number of memories updated via merge strategy
 *   - `skippedCount`: Number of memories skipped due to conflicts
 *   - `replacedCount`: Number of memories overwritten
 *   - `failures`: Array of {id, reason} for failed imports (optional)
 *   - `dryRun`: Whether this was a dry run
 *   - `error`: Error message if status is 'error'
 *
 * @throws Never throws directly; errors are returned in the response object
 *
 * @example
 * // Import from JSON string with merge strategy
 * const jsonData = await fs.readFile('backup.json', 'utf-8');
 * const result = await importMemories({
 *   raw: jsonData,
 *   basePath: '/path/to/project/.claude/memory',
 *   strategy: 'merge'
 * });
 * if (result.status === 'success') {
 *   console.log(`Imported: ${result.importedCount}`);
 *   console.log(`Merged: ${result.mergedCount}`);
 *   console.log(`Skipped: ${result.skippedCount}`);
 * }
 *
 * @example
 * // Dry run to preview import results
 * const result = await importMemories({
 *   raw: yamlData,
 *   basePath: '/path/to/project/.claude/memory',
 *   dryRun: true
 * });
 * console.log(`Would import ${result.importedCount} memories`);
 *
 * @example
 * // Import into an agent's scope with replace strategy
 * const result = await importMemories({
 *   data: exportPackage,
 *   targetScope: Scope.AgentProject,
 *   agent: 'typescript-expert',
 *   strategy: 'replace'
 * });
 */
export async function importMemories(
  request: ImportMemoriesRequest
): Promise<ImportMemoriesResponse> {
  const basePath = request.basePath ?? process.cwd();
  const strategy = request.strategy ?? 'merge';

  try {
    // Parse data if raw string provided
    let data: ExportPackage;

    if (request.data) {
      data = request.data;
    } else if (request.raw) {
      data = parseImportData(request.raw);
    } else {
      return {
        status: 'error',
        error: 'Either data or raw import string is required',
      };
    }

    // Validate package
    if (!data.version || !data.memories) {
      return {
        status: 'error',
        error: 'Invalid import package: missing version or memories',
      };
    }

    if (data.memories.length === 0) {
      return {
        status: 'success',
        importedCount: 0,
        mergedCount: 0,
        skippedCount: 0,
        replacedCount: 0,
        dryRun: request.dryRun,
      };
    }

    // Process imports
    let importedCount = 0;
    let mergedCount = 0;
    let skippedCount = 0;
    let replacedCount = 0;
    const failures: Array<{ id: string; reason: string }> = [];

    for (const memory of data.memories) {
      // Check if memory already exists
      const existing = await findInIndex(basePath, memory.id);

      if (existing) {
        // Handle conflict based on strategy
        if (strategy === 'skip') {
          skippedCount++;
          continue;
        }

        if (strategy === 'merge') {
          // Merge: update only if import is newer
          const existingDate = new Date(existing.updated);
          const importDate = new Date(memory.frontmatter.updated);

          if (importDate <= existingDate) {
            skippedCount++;
            continue;
          }
          mergedCount++;
        } else if (strategy === 'replace') {
          replacedCount++;
        }
      }

      // Dry run - don't actually write
      if (request.dryRun) {
        importedCount++;
        continue;
      }

      // Determine scope - use target scope, then memory's scope, then source scope, then default to Global
      const scope = request.targetScope ?? memory.frontmatter.scope ?? data.sourceScope ?? Scope.Global;

      // Write the memory
      const result = await writeMemory({
        id: memory.id,
        type: memory.frontmatter.type,
        title: memory.frontmatter.title,
        content: memory.content,
        tags: memory.frontmatter.tags,
        scope,
        agent: request.agent,
        projectRoot: request.projectRoot,
        globalRoot: request.globalRoot,
        created: memory.frontmatter.created,
        updated: memory.frontmatter.updated,
        links: memory.frontmatter.links,
        severity: memory.frontmatter.severity,
        basePath,
      });

      if (result.status === 'success') {
        importedCount++;
      } else {
        failures.push({
          id: memory.id,
          reason: result.error ?? 'Unknown error',
        });
      }
    }

    // Import graph relationships if present
    if (!request.dryRun && data.graph?.edges) {
      for (const edge of data.graph.edges) {
        await linkMemories({
          source: edge.source,
          target: edge.target,
          relation: edge.label,
          basePath,
        });
      }
    }

    log.info('Import complete', {
      imported: importedCount,
      merged: mergedCount,
      skipped: skippedCount,
      replaced: replacedCount,
      failed: failures.length,
    });

    return {
      status: 'success',
      importedCount,
      mergedCount,
      skippedCount,
      replacedCount,
      failures: failures.length > 0 ? failures : undefined,
      dryRun: request.dryRun,
    };
  } catch (error) {
    log.error('Import failed', { error: String(error) });
    return {
      status: 'error',
      error: `Import failed: ${String(error)}`,
    };
  }
}

/**
 * Parse import data from JSON or YAML string with validation
 */
function parseImportData(raw: string): ExportPackage {
  const trimmed = raw.trim();

  let parsed: unknown;

  // Try JSON first (faster and more common)
  if (trimmed.startsWith('{')) {
    try {
      parsed = JSON.parse(trimmed);
      parsed = sanitiseObject(parsed);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    // Parse YAML using js-yaml library
    try {
      parsed = yaml.load(trimmed, { schema: yaml.JSON_SCHEMA });
      parsed = sanitiseObject(parsed);
    } catch (error) {
      throw new Error(`Invalid YAML: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Validate structure
  if (!isValidExportPackage(parsed)) {
    throw new Error('Invalid import package structure: missing or invalid required fields');
  }

  return parsed;
}
