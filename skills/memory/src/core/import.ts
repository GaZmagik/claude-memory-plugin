/**
 * Import Operation
 *
 * Import memories from a portable format (JSON or YAML).
 */

import type {
  ImportMemoriesRequest,
  ImportMemoriesResponse,
  ExportPackage,
} from '../types/api.js';
import { findInIndex } from './index.js';
import { writeMemory } from './write.js';
import { linkMemories } from '../graph/link.js';
import { createLogger } from './logger.js';

const log = createLogger('import');

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

      // Determine target scope (default to Global if not specified)
      const scope = request.targetScope ?? memory.frontmatter.scope ?? data.sourceScope ?? undefined;

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
 * Parse import data from JSON or YAML string
 */
function parseImportData(raw: string): ExportPackage {
  const trimmed = raw.trim();

  // Try JSON first
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }

  // Parse YAML (simple parser for our export format)
  return parseYaml(trimmed);
}

/**
 * Simple YAML parser for export package format
 */
function parseYaml(yaml: string): ExportPackage {
  const lines = yaml.split('\n');
  const result: ExportPackage = {
    version: '',
    exportedAt: '',
    memories: [],
  };

  let currentMemory: Record<string, unknown> | null = null;
  let currentFrontmatter: Record<string, unknown> | null = null;
  let contentLines: string[] = [];
  let inContent = false;
  let inGraph = false;
  let inNodes = false;
  let inEdges = false;
  let currentNode: Record<string, unknown> | null = null;
  let currentEdge: Record<string, unknown> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Top-level fields
    if (line.startsWith('version:')) {
      result.version = extractValue(trimmed);
    } else if (line.startsWith('exportedAt:')) {
      result.exportedAt = extractValue(trimmed);
    } else if (line.startsWith('sourceScope:')) {
      result.sourceScope = extractValue(trimmed) as ExportPackage['sourceScope'];
    } else if (line.startsWith('memories:')) {
      // Start memories section
    } else if (line.startsWith('graph:')) {
      inGraph = true;
      result.graph = { nodes: [], edges: [] };
    } else if (inGraph && trimmed === 'nodes:') {
      inNodes = true;
      inEdges = false;
    } else if (inGraph && trimmed === 'edges:') {
      inEdges = true;
      inNodes = false;
    } else if (inNodes && trimmed.startsWith('- id:')) {
      if (currentNode) {
        result.graph!.nodes.push(currentNode as { id: string; type: string });
      }
      currentNode = { id: extractValue(trimmed.slice(2)) };
    } else if (inNodes && currentNode && trimmed.startsWith('type:')) {
      currentNode.type = extractValue(trimmed);
    } else if (inEdges && trimmed.startsWith('- source:')) {
      if (currentEdge) {
        result.graph!.edges.push(currentEdge as { source: string; target: string; label: string });
      }
      currentEdge = { source: extractValue(trimmed.slice(2)) };
    } else if (inEdges && currentEdge && trimmed.startsWith('target:')) {
      currentEdge.target = extractValue(trimmed);
    } else if (inEdges && currentEdge && trimmed.startsWith('label:')) {
      currentEdge.label = extractValue(trimmed);
    } else if (trimmed.startsWith('- id:')) {
      // New memory
      if (currentMemory && currentFrontmatter) {
        currentMemory.frontmatter = currentFrontmatter;
        currentMemory.content = contentLines.join('\n').trim();
        result.memories.push(currentMemory as unknown as ExportPackage['memories'][0]);
      }
      currentMemory = { id: extractValue(trimmed.slice(2)) };
      currentFrontmatter = null;
      contentLines = [];
      inContent = false;
    } else if (currentMemory && trimmed === 'frontmatter:') {
      currentFrontmatter = {};
    } else if (currentFrontmatter && trimmed.startsWith('type:')) {
      currentFrontmatter.type = extractValue(trimmed);
    } else if (currentFrontmatter && trimmed.startsWith('title:')) {
      currentFrontmatter.title = extractValue(trimmed);
    } else if (currentFrontmatter && trimmed.startsWith('created:')) {
      currentFrontmatter.created = extractValue(trimmed);
    } else if (currentFrontmatter && trimmed.startsWith('updated:')) {
      currentFrontmatter.updated = extractValue(trimmed);
    } else if (currentFrontmatter && trimmed.startsWith('scope:')) {
      currentFrontmatter.scope = extractValue(trimmed);
    } else if (currentFrontmatter && trimmed.startsWith('tags:')) {
      const tagsStr = trimmed.slice(5).trim();
      if (tagsStr.startsWith('[')) {
        currentFrontmatter.tags = tagsStr
          .slice(1, -1)
          .split(',')
          .map(t => t.trim().replace(/"/g, ''))
          .filter(t => t);
      } else {
        currentFrontmatter.tags = [];
      }
    } else if (currentMemory && trimmed.startsWith('content:')) {
      inContent = true;
    } else if (inContent && line.startsWith('      ')) {
      contentLines.push(line.slice(6));
    }
  }

  // Don't forget the last memory
  if (currentMemory && currentFrontmatter) {
    currentMemory.frontmatter = currentFrontmatter;
    currentMemory.content = contentLines.join('\n').trim();
    result.memories.push(currentMemory as unknown as ExportPackage['memories'][0]);
  }

  // Don't forget the last graph nodes/edges
  if (currentNode) {
    result.graph!.nodes.push(currentNode as { id: string; type: string });
  }
  if (currentEdge) {
    result.graph!.edges.push(currentEdge as { source: string; target: string; label: string });
  }

  return result;
}

/**
 * Extract value from YAML line
 */
function extractValue(line: string): string {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return '';

  let value = line.slice(colonIdx + 1).trim();

  // Remove surrounding quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  // Unescape
  return value.replace(/\\"/g, '"').replace(/\\n/g, '\n');
}
