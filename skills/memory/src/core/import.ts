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
import { linkMemories } from '../graph/link.js';
import { createLogger } from './logger.js';
import { isValidExportPackage } from './validation.js';

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

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj as object)) {
    if (!dangerous.includes(key)) {
      result[key] = sanitiseObject((obj as Record<string, unknown>)[key]);
    }
  }

  return result as T;
}

/**
 * Import memories from export package
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
      parsed = yaml.load(trimmed);
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
