/**
 * Scope indicator utilities for multi-scope operations
 *
 * Phase D: Shared Memory Inclusion
 * Provides utilities to identify scope types from paths and format
 * memory results with scope indicators for multi-scope searches.
 */

import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Determine scope name from a memory storage path
 *
 * Identifies which scope type a path belongs to:
 * - agent-project: Agent scope in project directory
 * - agent-global: Agent scope in global directory
 * - local: Local scope (.claude/memory/local)
 * - project: Project scope (.claude/memory)
 * - global: Global scope (~/.claude/memory)
 * - unknown: Unrecognized path pattern
 *
 * @param basePath - Absolute path to memory directory
 * @returns Scope name string
 *
 * @example
 * getScopeNameFromPath('/project/.claude/memory/agents/typescript-expert')
 * // Returns: 'agent-project'
 *
 * getScopeNameFromPath('~/.claude/memory')
 * // Returns: 'global'
 */
export function getScopeNameFromPath(basePath: string): string {
  if (!basePath || basePath.trim() === '') {
    return 'unknown';
  }

  const normalizedPath = path.normalize(basePath);
  const homeDir = os.homedir();

  // Check for agent scope (highest priority)
  if (normalizedPath.includes('/agents/')) {
    // Determine if agent-project or agent-global by checking if in home dir
    if (normalizedPath.startsWith(homeDir)) {
      return 'agent-global';
    }
    return 'agent-project';
  }

  // Check for local scope
  if (normalizedPath.includes('/.claude/memory/local')) {
    return 'local';
  }

  // Check for global scope (in home directory)
  if (normalizedPath.startsWith(homeDir) && normalizedPath.includes('.claude/memory')) {
    return 'global';
  }

  // Check for project scope (not in home, has .claude/memory)
  if (normalizedPath.includes('.claude/memory')) {
    return 'project';
  }

  return 'unknown';
}

/**
 * Format a memory result with scope indicator
 *
 * Adds a [scope] prefix to memory IDs for multi-scope search results.
 *
 * @param memoryId - Memory identifier
 * @param scope - Scope name (from getScopeNameFromPath)
 * @returns Formatted string: "[scope] memory-id"
 *
 * @example
 * formatScopedResult('learning-typescript-patterns', 'agent-project')
 * // Returns: '[agent-project] learning-typescript-patterns'
 *
 * formatScopedResult('decision-api-design', 'project')
 * // Returns: '[project] decision-api-design'
 */
export function formatScopedResult(memoryId: string, scope: string): string {
  return `[${scope}] ${memoryId}`;
}
