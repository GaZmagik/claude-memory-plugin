/**
 * Agent Directory Existence Check Utility
 *
 * Checks if an agent directory already exists.
 */

import { access } from 'node:fs/promises';
import { Scope } from '../types/enums.js';
import { getAgentDirectoryPath } from '../scope/get-agent-directory-path.js';

/**
 * Checks if agent directory exists.
 *
 * @param scope - Agent scope (AgentProject or AgentGlobal)
 * @param agentName - Agent name (will be sanitised)
 * @param projectRoot - Project root path (required for AgentProject scope)
 * @param globalRoot - Global memory root path (required for AgentGlobal scope)
 * @returns True if agent directory exists, false otherwise
 */
export async function agentDirectoryExists(
  scope: Scope.AgentProject | Scope.AgentGlobal,
  agentName: string,
  projectRoot?: string,
  globalRoot?: string
): Promise<boolean> {
  const agentDir = getAgentDirectoryPath({
    scope,
    agentName,
    projectRoot,
    globalRoot,
  });

  try {
    await access(agentDir);
    return true;
  } catch {
    return false;
  }
}
