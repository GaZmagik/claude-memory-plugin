/**
 * Agent copying operations
 */

import { getAgentDirectoryPath } from '../../scope/get-agent-directory-path.js';
import { agentDirectoryExists } from '../../storage/agent-directory-exists.js';
import { createAgentDirectory } from '../../storage/create-agent-directory.js';
import { exportMemories } from '../../core/export.js';
import { importMemories } from '../../core/import.js';
import type { CopyAgentRequest, CopyAgentResponse } from './types.js';
import { Scope } from '../../types/enums.js';

/**
 * Copies an agent to a new name
 *
 * @param request - Agent copy request
 * @returns Success response with copy summary
 * @throws Error if source not found or target exists without --force
 *
 * @example
 * await copyAgent({
 *   source: 'typescript-expert',
 *   target: 'typescript-pro',
 *   scope: Scope.AgentProject,
 *   projectRoot: '/home/user/project',
 *   globalRoot: '/home/user/.claude/memory',
 * });
 */
export async function copyAgent(request: CopyAgentRequest): Promise<CopyAgentResponse> {
  const sourceName = request.source.trim().toLowerCase();
  const targetName = request.target.trim().toLowerCase();

  if (!sourceName || !targetName) {
    throw new Error('Source and target agent names cannot be empty');
  }

  // Check if source exists
  const agentScope = request.scope as Scope.AgentProject | Scope.AgentGlobal;
  const sourceExists = await agentDirectoryExists(
    agentScope,
    sourceName,
    request.projectRoot,
    request.globalRoot
  );

  if (!sourceExists) {
    throw new Error(`Source agent not found: ${sourceName}`);
  }

  // Check if target already exists
  const targetExists = await agentDirectoryExists(
    agentScope,
    targetName,
    request.projectRoot,
    request.globalRoot
  );

  if (targetExists && !request.force) {
    throw new Error(`Target agent already exists: ${targetName}`);
  }

  // Get source and target paths
  const sourcePath = getAgentDirectoryPath({
    scope: request.scope,
    agentName: sourceName,
    projectRoot: request.projectRoot,
    globalRoot: request.globalRoot,
  });

  const targetPath = getAgentDirectoryPath({
    scope: request.scope,
    agentName: targetName,
    projectRoot: request.projectRoot,
    globalRoot: request.globalRoot,
  });

  // Export all memories from source
  const exportResult = await exportMemories({
    basePath: sourcePath,
    format: 'json',
    includeGraph: true,
  });

  if (exportResult.status !== 'success' || !exportResult.data) {
    throw new Error(`Failed to export from source: ${exportResult.error}`);
  }

  const memoryCount = exportResult.data.memories.length;

  // Early return for dry-run
  if (request.dryRun) {
    return {
      status: 'success',
      source: sourceName,
      target: targetName,
      memoriesCopied: memoryCount,
      dryRun: true,
    };
  }

  // Create target agent if doesn't exist
  if (!targetExists) {
    await createAgentDirectory(
      agentScope,
      targetName,
      request.projectRoot,
      request.globalRoot
    );
  }

  // Import memories to target
  const importResult = await importMemories({
    basePath: targetPath,
    data: exportResult.data,
    strategy: request.force ? 'replace' : 'skip',
    targetScope: request.scope,
    agent: targetName,
    projectRoot: request.projectRoot,
    globalRoot: request.globalRoot,
    dryRun: false,
  });

  if (importResult.status !== 'success') {
    throw new Error(`Failed to import to target: ${importResult.error}`);
  }

  return {
    status: 'success',
    source: sourceName,
    target: targetName,
    memoriesCopied: memoryCount,
    dryRun: false,
  };
}
