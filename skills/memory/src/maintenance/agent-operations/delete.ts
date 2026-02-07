/**
 * Agent deletion operations
 */

import * as fs from 'node:fs/promises';
import { getAgentDirectoryPath } from '../../scope/get-agent-directory-path.js';
import { agentDirectoryExists } from '../../storage/agent-directory-exists.js';
import { loadIndex } from '../../core/index.js';
import { deleteMemory } from '../../core/delete.js';
import { confirmDeletion, shouldConfirm } from '../../cli/confirmation.js';
import type { DeleteAgentRequest, DeleteAgentResponse } from './types.js';
import { Scope } from '../../types/enums.js';

/**
 * Deletes an agent and all its memories
 *
 * @param request - Agent deletion request
 * @returns Success response or cancellation
 * @throws Error if agent not found
 *
 * @example
 * await deleteAgent({
 *   name: 'old-agent',
 *   scope: Scope.AgentProject,
 *   projectRoot: '/home/user/project',
 *   globalRoot: '/home/user/.claude/memory',
 *   force: true,
 * });
 */
export async function deleteAgent(request: DeleteAgentRequest): Promise<DeleteAgentResponse> {
  const agentName = request.name.trim().toLowerCase();

  if (!agentName) {
    throw new Error('Agent name cannot be empty');
  }

  // Check if agent exists
  const agentScope = request.scope as Scope.AgentProject | Scope.AgentGlobal;
  const exists = await agentDirectoryExists(
    agentScope,
    agentName,
    request.projectRoot,
    request.globalRoot
  );

  if (!exists) {
    throw new Error(`Agent not found: ${agentName}`);
  }

  // Get agent directory path
  const agentPath = getAgentDirectoryPath({
    scope: request.scope,
    agentName: agentName,
    projectRoot: request.projectRoot,
    globalRoot: request.globalRoot,
  });

  // Load index to count memories (handle missing/corrupt index gracefully)
  let memoryCount = 0;
  let memoryIds: string[] = [];

  try {
    const index = await loadIndex({ basePath: agentPath });
    memoryCount = index.memories.length;
    memoryIds = index.memories.map((m) => m.id);
  } catch {
    // If index is missing or corrupt, assume 0 memories
    memoryCount = 0;
    memoryIds = [];
  }

  // Early return for dry-run
  if (request.dryRun) {
    return {
      status: 'success',
      agent: agentName,
      memoriesDeleted: memoryCount,
      deleted: [],
      dryRun: true,
    };
  }

  // Check if confirmation is needed
  if (shouldConfirm(request.force || false, request.dryRun || false)) {
    const confirmed = request.confirmationCallback
      ? await request.confirmationCallback(agentName, memoryCount)
      : await confirmDeletion(agentName, memoryCount);

    if (!confirmed) {
      return {
        status: 'cancelled',
      };
    }
  }

  // Delete all memories
  const deleted: string[] = [];
  const failedDeletions: Array<{ id: string; error: string }> = [];

  for (const memoryId of memoryIds) {
    try {
      await deleteMemory({
        id: memoryId,
        basePath: agentPath,
        scope: request.scope,
        agent: agentName,
      });
      deleted.push(memoryId);
    } catch (error) {
      // Continue deleting other memories even if one fails
      failedDeletions.push({
        id: memoryId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Remove agent directory
  let directoryRemovalFailed = false;
  let directoryRemovalError: string | undefined;

  try {
    await fs.rm(agentPath, { recursive: true, force: true });
  } catch (error) {
    directoryRemovalFailed = true;
    directoryRemovalError = error instanceof Error ? error.message : String(error);
  }

  // Determine overall status
  const hasFailures = failedDeletions.length > 0 || directoryRemovalFailed;
  const status = hasFailures ? 'partial-success' : 'success';

  return {
    status,
    agent: agentName,
    memoriesDeleted: deleted.length,
    deleted,
    ...(failedDeletions.length > 0 && { failedDeletions }),
    ...(directoryRemovalFailed && { directoryRemovalFailed, directoryRemovalError }),
    dryRun: false,
  };
}
