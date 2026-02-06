/**
 * CLI Helpers: Shared utilities for command handlers
 *
 * Extracts common helper functions used across all command files
 * to eliminate duplication and centralise scope/path resolution.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import { Scope, MemoryType } from '../types/enums.js';
import { getScopePath, resolveScope, getDefaultScope } from '../scope/resolver.js';
import { validateAgentName } from '../scope/validate-agent-name.js';

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
 * Resolve agent-scoped path with validation
 *
 * @param agentName - Agent name (will be validated)
 * @param scopeStr - Optional scope string (agent-project, agent-global, etc.)
 *                   If not provided, defaults based on git context
 * @returns Resolved path to agent's memory directory
 * @throws Error if agent name is invalid or scope resolution fails
 *
 * @example
 * resolveAgentScopePath('typescript-expert') // Uses default scope
 * resolveAgentScopePath('rust-expert', 'global') // Explicit scope
 * resolveAgentScopePath('api-architect', 'agent-project') // Agent scope
 */
export function resolveAgentScopePath(
  agentName: string,
  scopeStr?: string
): string {
  // Validate agent name first
  const validation = validateAgentName(agentName);
  if (!validation.valid) {
    const suggestion = validation.suggestion
      ? ` (suggestion: ${validation.suggestion})`
      : '';
    throw new Error(`${validation.error}${suggestion}`);
  }

  const cwd = process.cwd();
  const globalMemoryPath = getGlobalMemoryPath();

  // Determine scope: explicit from flag OR default based on context
  let scope: Scope;
  if (scopeStr) {
    // Parse explicit scope string
    scope = parseScope(scopeStr);
    // If user specified a non-agent scope, convert to agent equivalent
    if (scope === Scope.Project) {
      scope = Scope.AgentProject;
    } else if (scope === Scope.Global) {
      scope = Scope.AgentGlobal;
    }
  } else {
    // No explicit scope - get default for agent context
    scope = getDefaultScope({ cwd, globalMemoryPath, agentName });
  }

  // Resolve the scope with agent context
  const resolution = resolveScope({
    requestedScope: scope,
    cwd,
    globalMemoryPath,
    agentName,
  });

  if (!resolution.path) {
    throw new Error(
      resolution.error || 'Failed to resolve agent scope path'
    );
  }

  return resolution.path;
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
    case 'agent-project':
    case 'agent':
      return Scope.AgentProject;
    case 'agent-global':
      return Scope.AgentGlobal;
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

/**
 * Resolve multiple scope paths for shared memory inclusion
 *
 * Returns array of scope paths in priority order:
 * 1. Agent scope (agent-project or agent-global)
 * 2. Local scope
 * 3. Project scope
 * 4. Global scope
 *
 * Used with --include-shared flag to search across agent's own memories
 * plus shared project/global knowledge.
 *
 * @param agentName - Agent name (validated)
 * @param scopeStr - Optional scope string (determines agent-project vs agent-global)
 * @returns Array of absolute paths to memory directories
 *
 * @example
 * resolveSharedScopePaths('typescript-expert')
 * // Returns: [
 * //   '/project/.claude/memory/agents/typescript-expert',
 * //   '/project/.claude/memory/local',
 * //   '/project/.claude/memory',
 * //   '/home/user/.claude/memory'
 * // ]
 */
export function resolveSharedScopePaths(
  agentName: string,
  scopeStr?: string
): string[] {
  const cwd = process.cwd();
  const globalMemoryPath = getGlobalMemoryPath();

  // 1. Agent scope (primary) - validates agent name
  const agentPath = resolveAgentScopePath(agentName, scopeStr);

  // 2. Shared scopes (in order: local → project)
  // Note: Excludes Global scope to avoid loading user's entire global memory in tests
  const sharedScopes = [Scope.Local, Scope.Project];
  const sharedPaths = sharedScopes
    .map(scope => {
      const resolution = resolveScope({
        requestedScope: scope,
        cwd,
        globalMemoryPath,
      });
      return resolution.path;
    })
    .filter((path): path is string => Boolean(path));

  return [agentPath, ...sharedPaths];
}

/**
 * Validate --include-shared flag requirements
 *
 * The --include-shared flag can only be used with --agent flag.
 * Returns validation result with error message if invalid.
 *
 * @param includeShared - Value of --include-shared flag
 * @param agentName - Value of --agent flag (may be undefined)
 * @returns Validation result with error if invalid
 *
 * @example
 * validateIncludeShared(true, undefined)
 * // Returns: { valid: false, error: '...' }
 *
 * validateIncludeShared(true, 'typescript-expert')
 * // Returns: { valid: true }
 */
export function validateIncludeShared(
  includeShared: boolean,
  agentName: string | undefined
): { valid: boolean; error?: string } {
  if (includeShared && !agentName) {
    return {
      valid: false,
      error: '--include-shared requires --agent flag. Specify which agent scope to search from.',
    };
  }
  return { valid: true };
}
