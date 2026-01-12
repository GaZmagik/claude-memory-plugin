/**
 * Pattern Matcher Utility
 *
 * Filter memories by glob pattern, tags, type, and scope.
 */

import type { IndexEntry } from '../types/memory.js';
import type { MemoryType, Scope } from '../types/enums.js';

/**
 * Filter criteria for memory selection
 */
export interface FilterCriteria {
  /** Glob pattern to match memory IDs (e.g., "decision-*") */
  pattern?: string;
  /** Filter by tags (AND logic - memory must have ALL tags) */
  tags?: string[];
  /** Filter by memory type */
  type?: MemoryType;
  /** Filter by scope */
  scope?: Scope;
}

/**
 * Simple glob pattern matching
 * Supports:
 * - * : matches any characters except /
 * - ? : matches single character
 * - ** : not supported (use * for simple matching)
 */
export function matchGlobPattern(pattern: string, text: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*/g, '.*') // * -> .*
    .replace(/\?/g, '.'); // ? -> .

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(text);
}

/**
 * Check if memory matches all specified tags (AND logic)
 */
export function matchTags(memoryTags: string[], filterTags: string[]): boolean {
  return filterTags.every(tag => memoryTags.includes(tag));
}

/**
 * Filter memories by criteria
 */
export function filterMemories(
  memories: IndexEntry[],
  criteria: FilterCriteria
): IndexEntry[] {
  return memories.filter(memory => {
    // Filter by pattern
    if (criteria.pattern) {
      if (!matchGlobPattern(criteria.pattern, memory.id)) {
        return false;
      }
    }

    // Filter by tags (AND logic)
    if (criteria.tags && criteria.tags.length > 0) {
      if (!matchTags(memory.tags, criteria.tags)) {
        return false;
      }
    }

    // Filter by type
    if (criteria.type) {
      if (memory.type !== criteria.type) {
        return false;
      }
    }

    // Filter by scope
    if (criteria.scope) {
      if (memory.scope !== criteria.scope) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Count memories matching criteria (without filtering full list)
 */
export function countMatches(
  memories: IndexEntry[],
  criteria: FilterCriteria
): number {
  return filterMemories(memories, criteria).length;
}
