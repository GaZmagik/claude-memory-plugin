/**
 * Export Operation
 *
 * Export memories to a portable format (JSON or YAML).
 */

import type {
  ExportMemoriesRequest,
  ExportMemoriesResponse,
  ExportPackage,
  ExportedMemory,
} from '../types/api.js';
import { loadIndex } from './index.js';
import { readMemory } from './read.js';
import { loadGraph } from '../graph/structure.js';
import { filterMemories } from '../bulk/pattern-matcher.js';
import { createLogger } from './logger.js';

const log = createLogger('export');

const EXPORT_VERSION = '1.0.0';

/**
 * Export memories to a portable format
 */
export async function exportMemories(
  request: ExportMemoriesRequest
): Promise<ExportMemoriesResponse> {
  const basePath = request.basePath ?? process.cwd();
  const format = request.format ?? 'json';

  try {
    // Load index
    const index = await loadIndex({ basePath });

    // Filter memories by criteria
    const matches = filterMemories(index.memories, {
      type: request.type,
      scope: request.scope,
      tags: request.tags,
    });

    if (matches.length === 0) {
      const emptyPackage: ExportPackage = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        sourceScope: request.scope,
        memories: [],
      };

      return {
        status: 'success',
        data: emptyPackage,
        serialised: serialise(emptyPackage, format),
        count: 0,
      };
    }

    // Read each memory to get full content
    const memories: ExportedMemory[] = [];

    for (const entry of matches) {
      const result = await readMemory({ id: entry.id, basePath });

      if (result.status === 'success' && result.memory) {
        memories.push({
          id: entry.id,
          frontmatter: result.memory.frontmatter,
          content: result.memory.content,
        });
      } else {
        log.warn('Failed to read memory for export', { id: entry.id, error: result.error });
      }
    }

    // Build export package
    const exportPackage: ExportPackage = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      sourceScope: request.scope,
      memories,
    };

    // Include graph if requested
    if (request.includeGraph) {
      const graph = await loadGraph(basePath);

      // Filter graph to only include exported memories
      const exportedIds = new Set(memories.map(m => m.id));

      exportPackage.graph = {
        nodes: graph.nodes.filter(n => exportedIds.has(n.id)),
        edges: graph.edges.filter(e => exportedIds.has(e.source) && exportedIds.has(e.target)),
      };
    }

    log.info('Exported memories', { count: memories.length, format });

    return {
      status: 'success',
      data: exportPackage,
      serialised: serialise(exportPackage, format),
      count: memories.length,
    };
  } catch (error) {
    log.error('Export failed', { error: String(error) });
    return {
      status: 'error',
      error: `Export failed: ${String(error)}`,
    };
  }
}

/**
 * Serialise export package to string
 */
function serialise(data: ExportPackage, format: 'json' | 'yaml'): string {
  if (format === 'yaml') {
    return toYaml(data);
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Simple YAML serialiser (no external dependency)
 */
function toYaml(data: ExportPackage, indent = 0): string {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  lines.push(`${prefix}version: "${data.version}"`);
  lines.push(`${prefix}exportedAt: "${data.exportedAt}"`);

  if (data.sourceScope) {
    lines.push(`${prefix}sourceScope: "${data.sourceScope}"`);
  }

  lines.push(`${prefix}memories:`);
  for (const memory of data.memories) {
    lines.push(`${prefix}  - id: "${memory.id}"`);
    lines.push(`${prefix}    frontmatter:`);
    lines.push(`${prefix}      type: "${memory.frontmatter.type}"`);
    lines.push(`${prefix}      title: "${escapeYaml(memory.frontmatter.title)}"`);
    lines.push(`${prefix}      created: "${memory.frontmatter.created}"`);
    lines.push(`${prefix}      updated: "${memory.frontmatter.updated}"`);

    if (memory.frontmatter.tags && memory.frontmatter.tags.length > 0) {
      lines.push(`${prefix}      tags: [${memory.frontmatter.tags.map(t => `"${t}"`).join(', ')}]`);
    }

    if (memory.frontmatter.scope) {
      lines.push(`${prefix}      scope: "${memory.frontmatter.scope}"`);
    }

    lines.push(`${prefix}    content: |`);
    const contentLines = memory.content.split('\n');
    for (const line of contentLines) {
      lines.push(`${prefix}      ${line}`);
    }
  }

  if (data.graph) {
    lines.push(`${prefix}graph:`);
    lines.push(`${prefix}  nodes:`);
    for (const node of data.graph.nodes) {
      lines.push(`${prefix}    - id: "${node.id}"`);
      lines.push(`${prefix}      type: "${node.type}"`);
    }
    lines.push(`${prefix}  edges:`);
    for (const edge of data.graph.edges) {
      lines.push(`${prefix}    - source: "${edge.source}"`);
      lines.push(`${prefix}      target: "${edge.target}"`);
      lines.push(`${prefix}      label: "${edge.label}"`);
    }
  }

  return lines.join('\n');
}

/**
 * Escape special characters for YAML strings
 */
function escapeYaml(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
