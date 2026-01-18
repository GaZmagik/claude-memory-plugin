/**
 * CLI Helpers: Shared utilities for command handlers
 *
 * Extracts common helper functions used across all command files
 * to eliminate duplication and centralise scope/path resolution.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import { Scope, MemoryType } from '../types/enums.js';
import { getScopePath } from '../scope/resolver.js';

/**
 * Get global memory path (~/.claude/memory)
 */
export function getGlobalMemoryPath(): string {
  return path.join(os.homedir(), '.claude', 'memory');
}

/**
 * Get resolved scope path with proper parameter handling
 *
 * Uses the 3-param signature for getScopePath as required.
 */
export function getResolvedScopePath(scope: Scope): string {
  const cwd = process.cwd();
  const globalPath = getGlobalMemoryPath();
  return getScopePath(scope, cwd, globalPath);
}

/**
 * Parse scope string to Scope enum
 *
 * Handles various string representations including aliases.
 * Defaults to Project scope if unrecognised.
 */
export function parseScope(scopeStr: string | undefined): Scope {
  switch (scopeStr?.toLowerCase()) {
    case 'user':
    case 'global':
      return Scope.Global;
    case 'project':
      return Scope.Project;
    case 'local':
      return Scope.Local;
    case 'enterprise':
      return Scope.Enterprise;
    default:
      return Scope.Project;
  }
}

/**
 * Parse memory type string to MemoryType enum
 *
 * Returns undefined if string doesn't match a known type.
 */
export function parseMemoryType(typeStr: string | undefined): MemoryType | undefined {
  switch (typeStr?.toLowerCase()) {
    case 'decision':
      return MemoryType.Decision;
    case 'learning':
      return MemoryType.Learning;
    case 'artifact':
      return MemoryType.Artifact;
    case 'gotcha':
      return MemoryType.Gotcha;
    case 'breadcrumb':
      return MemoryType.Breadcrumb;
    case 'hub':
      return MemoryType.Hub;
    default:
      return undefined;
  }
}
