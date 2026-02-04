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
