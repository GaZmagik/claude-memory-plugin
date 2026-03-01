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
 * Simple glob pattern matching (non-recursive, iterative — no regex)
 * Supports:
 * - * : matches any sequence of characters
 * - ? : matches any single character
 *
 * Uses an iterative two-pointer algorithm that is O(m×n) worst case
 * with no backtracking, eliminating ReDoS risk (CWE-1333).
 *
 * Note: Matching is done on memory IDs only, not paths.
 */
export function matchGlobPattern(pattern: string, text: string): boolean {
  let pi = 0; // pattern index
  let ti = 0; // text index
  let starPi = -1; // pattern index of last '*'
  let starTi = -1; // text index when last '*' was encountered

  while (ti < text.length) {
    if (pi < pattern.length && (pattern[pi] === text[ti] || pattern[pi] === '?')) {
      pi++;
      ti++;
    } else if (pi < pattern.length && pattern[pi] === '*') {
      starPi = pi;
      starTi = ti;
      pi++; // try matching zero characters for *
    } else if (starPi >= 0) {
      // Backtrack to last star, consume one more character
      pi = starPi + 1;
      starTi++;
      ti = starTi;
    } else {
      return false;
    }
  }

  // Consume remaining stars in pattern
  while (pi < pattern.length && pattern[pi] === '*') {
    pi++;
  }

  return pi === pattern.length;
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
 * Count memories matching criteria without allocating a filtered array.
 */
export function countMatches(
  memories: IndexEntry[],
  criteria: FilterCriteria
): number {
  let count = 0;
  for (const memory of memories) {
    if (criteria.pattern && !matchGlobPattern(criteria.pattern, memory.id)) continue;
    if (criteria.tags && criteria.tags.length > 0 && !matchTags(memory.tags, criteria.tags)) continue;
    if (criteria.type && memory.type !== criteria.type) continue;
    if (criteria.scope && memory.scope !== criteria.scope) continue;
    count++;
  }
  return count;
}
