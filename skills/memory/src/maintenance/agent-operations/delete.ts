/**
 * Agent deletion operations
 */

import * as fs from 'node:fs/promises';
import { getAgentDirectoryPath } from '../../scope/get-agent-directory-path.js';
import { agentDirectoryExists } from '../../storage/agent-directory-exists.js';
import { loadIndex } from '../../core/index.js';
import { deleteMemory } from '../../core/delete.js';
import { confirmDeletion, shouldConfirm } from '../../cli/confirmation.js';
import { createLogger } from '../../core/logger.js';
import type { DeleteAgentRequest, DeleteAgentResponse } from './types.js';
import { Scope } from '../../types/enums.js';

const log = createLogger('agent-delete');

/**
 * Deletes an agent and all its memories from the filesystem.
 *
 * This function performs the following operations:
 * 1. Validates and normalises the agent name
 * 2. Verifies the agent exists at the specified scope
 * 3. Loads the agent's index to identify all memories
 * 4. Prompts for confirmation (unless `force` is enabled or in dry-run mode)
 * 5. Deletes each memory individually using the memory deletion system
 * 6. Removes the agent directory and all remaining files
 *
 * The deletion is performed with resilience - if individual memory deletions fail,
 * the operation continues with remaining memories. The response indicates whether
 * any failures occurred via the `status` field ('partial-success' vs 'success').
 *
 * The function supports:
 * - **Dry-run mode**: Validates and counts what would be deleted without side effects
 * - **Force mode**: Skips the interactive confirmation prompt
 * - **Custom confirmation**: Provides a callback for custom confirmation UI
 *
 * If the agent's index.json is missing or corrupted, the function gracefully
 * continues with an empty memory list, still attempting to remove the directory.
 *
 * @param request - The agent deletion request containing:
 *   - `name` - The name of the agent to delete
 *   - `scope` - The scope of the agent (AgentProject or AgentGlobal)
 *   - `projectRoot` - The project root directory path
 *   - `globalRoot` - The global memory root directory path
 *   - `force` - Optional flag to skip confirmation prompt
 *   - `dryRun` - Optional flag to simulate deletion without side effects
 *   - `confirmationCallback` - Optional custom function for confirmation UI
 *
 * @returns A promise resolving to {@link DeleteAgentResponse} containing:
 *   - `status` - 'success', 'partial-success', or 'cancelled'
 *   - `agent` - The deleted agent name (not present if cancelled)
 *   - `memoriesDeleted` - Count of successfully deleted memories
 *   - `deleted` - Array of deleted memory IDs
 *   - `failedDeletions` - Array of objects with `id` and `error` for failed deletions
 *   - `directoryRemovalFailed` - Boolean indicating if directory removal failed
 *   - `directoryRemovalError` - Error message if directory removal failed
 *   - `dryRun` - Boolean indicating if this was a dry-run operation
 *
 * @throws {Error} When the agent name is empty
 * @throws {Error} When the agent does not exist at the specified scope
 *
 * @example
 * // Delete an agent with force (no confirmation)
 * const result = await deleteAgent({
 *   name: 'old-agent',
 *   scope: Scope.AgentProject,
 *   projectRoot: '/home/user/project',
 *   globalRoot: '/home/user/.claude/memory',
 *   force: true,
 * });
 * if (result.status === 'success') {
 *   console.log(`Deleted ${result.memoriesDeleted} memories`);
 * }
 *
 * @example
 * // Delete with custom confirmation callback
 * const result = await deleteAgent({
 *   name: 'important-agent',
 *   scope: Scope.AgentGlobal,
 *   projectRoot: '/home/user/project',
 *   globalRoot: '/home/user/.claude/memory',
 *   confirmationCallback: async (name, count) => {
 *     return await myCustomPrompt(`Delete ${name} with ${count} memories?`);
 *   },
 * });
 *
 * @example
 * // Dry-run to preview deletion
 * const dryRunResult = await deleteAgent({
 *   name: 'test-agent',
 *   scope: Scope.AgentProject,
 *   projectRoot: '/home/user/project',
 *   globalRoot: '/home/user/.claude/memory',
 *   dryRun: true,
 * });
 * console.log(`Would delete ${dryRunResult.memoriesDeleted} memories`);
 *
 * @example
 * // Handle partial success
 * const result = await deleteAgent({
 *   name: 'problematic-agent',
 *   scope: Scope.AgentProject,
 *   projectRoot: '/home/user/project',
 *   globalRoot: '/home/user/.claude/memory',
 *   force: true,
 * });
 * if (result.status === 'partial-success') {
 *   console.warn('Some deletions failed:', result.failedDeletions);
 * }
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
  } catch (error) {
    // Log warning to help diagnose index issues (could be missing or corrupt)
    log.warn('Failed to load index for agent - assuming empty', {
      agent: agentName,
      agentPath,
      error: error instanceof Error ? error.message : String(error),
    });
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
