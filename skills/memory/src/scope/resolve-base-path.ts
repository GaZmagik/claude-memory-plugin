/**
 * Resolve Base Path Utility
 *
 * Extracts the duplicated agent-scope resolution block that was previously
 * copy-pasted across read, delete, search, and semantic-search operations.
 *
 * For write operations, directory creation is handled separately via
 * createAgentDirectory — this utility resolves the path only.
 */

import * as path from 'node:path';
import * as os from 'node:os';
import { Scope } from '../types/enums.js';
import { isAgentScope } from './is-agent-scope.js';
import { getAgentDirectoryPath } from './get-agent-directory-path.js';

/** Fields from a request object that are needed for base-path resolution. */
export interface BasePathRequest {
  scope?: Scope;
  agent?: string;
  basePath?: string;
}

/** Successful resolution result. */
export interface BasePathSuccess {
  basePath: string;
  error?: never;
}

/** Failed resolution result. */
export interface BasePathError {
  basePath?: never;
  error: string;
}

/** Discriminated union returned by resolveBasePath(). */
export type BasePathResult = BasePathSuccess | BasePathError;

/**
 * Resolves the base storage path for a memory operation.
 *
 * Handles two cases:
 *
 * 1. **Agent scopes** (`Scope.AgentProject` / `Scope.AgentGlobal`):
 *    Delegates to `getAgentDirectoryPath()` to construct the agent-namespaced
 *    path.  Requires `request.agent` to be present and non-empty; returns an
 *    error result if it is absent.
 *
 * 2. **Regular scopes** (all other values, or no scope at all):
 *    Returns `request.basePath` if supplied, otherwise falls back to
 *    `process.cwd()`.
 *
 * @param request - Partial request object carrying `scope`, `agent`, and
 *   `basePath` fields.
 * @returns `{ basePath }` on success or `{ error }` on failure.
 *
 * @example
 * // Regular scope with explicit path
 * const result = resolveBasePath({ scope: Scope.Project, basePath: '/project/.claude/memory' });
 * // => { basePath: '/project/.claude/memory' }
 *
 * @example
 * // Agent-project scope
 * const result = resolveBasePath({ scope: Scope.AgentProject, agent: 'typescript-expert' });
 * // => { basePath: '/cwd/.claude/memory/agents/typescript-expert' }
 *
 * @example
 * // Missing agent name — returns an error
 * const result = resolveBasePath({ scope: Scope.AgentProject });
 * // => { error: 'agent field is required for agent scopes' }
 */
export function resolveBasePath(request: BasePathRequest): BasePathResult {
  if (request.scope && isAgentScope(request.scope)) {
    // Agent scope — agent name is mandatory
    if (!request.agent) {
      return { error: 'agent field is required for agent scopes' };
    }

    const projectRoot =
      request.scope === Scope.AgentProject ? process.cwd() : undefined;

    // For global agent scope, use the supplied basePath as the global root,
    // or fall back to the conventional ~/.claude/memory location.
    const globalRoot =
      request.scope === Scope.AgentGlobal
        ? (request.basePath ?? path.join(os.homedir(), '.claude', 'memory'))
        : undefined;

    try {
      const basePath = getAgentDirectoryPath({
        scope: request.scope,
        agentName: request.agent,
        projectRoot,
        globalRoot,
      });
      return { basePath };
    } catch (err) {
      return { error: String(err instanceof Error ? err.message : err) };
    }
  }

  // Regular scope — use supplied basePath or fall back to cwd
  return { basePath: request.basePath ?? process.cwd() };
}
