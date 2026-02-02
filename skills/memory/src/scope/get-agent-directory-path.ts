import path from 'path';
import { Scope } from '../types/enums.js';
import { isAgentScope } from './is-agent-scope.js';

export interface AgentDirectoryOptions {
  scope: Scope;
  agentName: string;
  projectRoot?: string;
  globalRoot?: string;
}

/**
 * Resolves the directory path for an agent's memory storage
 *
 * @param options - Options specifying scope, agent name, and root paths
 * @returns Absolute path to agent's memory directory
 * @throws Error if scope is not an agent scope or required parameters missing
 *
 * @example
 * // Agent-project scope
 * getAgentDirectoryPath({
 *   scope: Scope.AgentProject,
 *   agentName: 'typescript-expert',
 *   projectRoot: '/home/user/project'
 * })
 * // => '/home/user/project/.claude/memory/agents/typescript-expert'
 *
 * // Agent-global scope
 * getAgentDirectoryPath({
 *   scope: Scope.AgentGlobal,
 *   agentName: 'typescript-expert',
 *   globalRoot: '/home/user/.claude/memory'
 * })
 * // => '/home/user/.claude/memory/agents/typescript-expert'
 */
export function getAgentDirectoryPath(options: AgentDirectoryOptions): string {
  const { scope, agentName, projectRoot, globalRoot } = options;

  // Validate scope
  if (!isAgentScope(scope)) {
    throw new Error(`Scope ${scope} is not an agent scope`);
  }

  // Validate agentName
  if (!agentName || agentName.trim() === '') {
    throw new Error('agentName is required for agent scope paths');
  }

  // Resolve path based on scope
  if (scope === Scope.AgentProject) {
    if (!projectRoot) {
      throw new Error('projectRoot is required for AgentProject scope');
    }
    return path.join(projectRoot, '.claude', 'memory', 'agents', agentName);
  }

  // AgentGlobal
  if (!globalRoot) {
    throw new Error('globalRoot is required for AgentGlobal scope');
  }
  return path.join(globalRoot, 'agents', agentName);
}
