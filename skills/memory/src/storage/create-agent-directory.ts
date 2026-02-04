/**
 * Agent Directory Creation Utility
 *
 * Ensures agent directory structure exists with permanent/ and temporary/ subdirectories.
 */

import { join } from 'node:path';
import { Scope } from '../types/enums.js';
import { ensureDir } from '../core/fs-utils.js';
import { getAgentDirectoryPath } from '../scope/get-agent-directory-path.js';

/**
 * Creates agent directory structure if it doesn't exist.
 *
 * Directory structure:
 * - {agentDir}/
 * - {agentDir}/permanent/
 * - {agentDir}/temporary/
 *
 * @param scope - Agent scope (AgentProject or AgentGlobal)
 * @param agentName - Agent name (will be sanitised)
 * @param projectRoot - Project root path (required for AgentProject scope)
 * @param globalRoot - Global memory root path (required for AgentGlobal scope)
 * @returns Absolute path to agent directory
 */
export async function createAgentDirectory(
  scope: Scope.AgentProject | Scope.AgentGlobal,
  agentName: string,
  projectRoot?: string,
  globalRoot?: string
): Promise<string> {
  // Get agent directory path (sanitisation happens in getAgentDirectoryPath)
  const agentDir = getAgentDirectoryPath({
    scope,
    agentName,
    projectRoot,
    globalRoot,
  });

  // Ensure base agent directory exists
  await ensureDir(agentDir);

  // Ensure subdirectories exist
  await ensureDir(join(agentDir, 'permanent'));
  await ensureDir(join(agentDir, 'temporary'));

  return agentDir;
}
