/**
 * Prune - Remove expired temporary memories
 *
 * Temporary memories (especially think documents) are auto-pruned after
 * a configurable TTL (default: 7 days). Concluded think documents may have
 * a shorter TTL as they've served their purpose.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseMemoryFile } from '../core/frontmatter.js';
import { deleteMemory } from '../core/delete.js';
import { loadGraph, saveGraph, removeNode } from '../graph/structure.js';

/**
 * Prune request options
 */
export interface PruneRequest {
  /** Base path for memory storage */
  basePath: string;
  /** TTL in days for temporary memories (default: 7) */
  ttlDays?: number;
  /** TTL in days for concluded think documents (default: 1) */
  concludedTtlDays?: number;
  /** Dry run - report what would be deleted without deleting */
  dryRun?: boolean;
}

/**
 * Prune response
 */
export interface PruneResponse {
  status: 'success' | 'error';
  /** Number of memories removed */
  removed: number;
  /** IDs of removed memories */
  removedIds: string[];
  /** Memories that would be removed (dry run only) */
  wouldRemove?: string[];
  /** Any errors encountered */
  errors?: string[];
}

/**
 * Check if a date is older than the specified number of days
 */
function isOlderThan(dateStr: string, days: number): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > days;
}

/**
 * Prune expired temporary memories
 */
export async function pruneMemories(request: PruneRequest): Promise<PruneResponse> {
  const { basePath, dryRun = false } = request;
  const ttlDays = request.ttlDays ?? 7;
  const concludedTtlDays = request.concludedTtlDays ?? 1;

  const temporaryDir = path.join(basePath, 'temporary');
  const removedIds: string[] = [];
  const wouldRemove: string[] = [];
  const errors: string[] = [];

  // Check if temporary directory exists
  if (!fs.existsSync(temporaryDir)) {
    return {
      status: 'success',
      removed: 0,
      removedIds: [],
    };
  }

  // Get all markdown files in temporary directory
  const files = fs.readdirSync(temporaryDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(temporaryDir, file);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = parseMemoryFile(content);
      // Note: parseMemoryFile throws on invalid input, caught by outer try

      const { frontmatter } = parsed;
      // ID comes from filename (frontmatter may have it in meta)
      const id = file.replace('.md', '');
      const created = frontmatter.created;
      const updated = frontmatter.updated;

      // Use the most recent date for comparison
      const referenceDate = updated ?? created;
      if (!referenceDate) {
        continue;
      }

      // Determine TTL based on document type/status
      let effectiveTtl = ttlDays;

      // Check if it's a concluded think document (shorter TTL)
      // Supports both new thought- prefix and legacy think- prefix
      const isThinkDocument = id.startsWith('thought-') || id.startsWith('think-');
      // Status can be at root level (think docs) or in meta
      // Cast to access fields that aren't in strict MemoryFrontmatter type
      const fm = frontmatter as unknown as Record<string, unknown>;
      const isConcluded = fm.status === 'concluded';

      if (isThinkDocument && isConcluded) {
        effectiveTtl = concludedTtlDays;
      }

      // Check if expired
      if (isOlderThan(referenceDate, effectiveTtl)) {
        if (dryRun) {
          wouldRemove.push(id);
        } else {
          // Delete the file
          try {
            await deleteMemory({ id, basePath });
            removedIds.push(id);
          } catch (deleteErr) {
            // If deleteMemory fails, try direct file deletion
            try {
              fs.unlinkSync(filePath);
              removedIds.push(id);

              // Also remove from graph if present
              try {
                const graph = await loadGraph(basePath);
                const updatedGraph = removeNode(graph, id);
                await saveGraph(basePath, updatedGraph);
              } catch {
                // Graph removal is best-effort
              }
            } catch (unlinkErr) {
              errors.push(`Failed to delete ${id}: ${unlinkErr}`);
            }
          }
        }
      }
    } catch (err) {
      errors.push(`Error processing ${file}: ${err}`);
    }
  }

  return {
    status: errors.length > 0 ? 'error' : 'success',
    removed: removedIds.length,
    removedIds,
    ...(dryRun && { wouldRemove }),
    ...(errors.length > 0 && { errors }),
  };
}
