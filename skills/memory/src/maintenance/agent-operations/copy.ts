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
 * Copies an existing agent to a new agent with a different name.
 *
 * This function performs the following operations:
 * 1. Validates and normalises both source and target agent names
 * 2. Verifies the source agent exists
 * 3. Checks if target agent exists (fails unless `force` is enabled)
 * 4. Exports all memories and graph data from the source agent
 * 5. Creates the target agent directory if it does not exist
 * 6. Imports the exported data into the target agent
 *
 * The copy operation creates a complete duplicate of the source agent including:
 * - All memory files with updated agent references
 * - The memory index (index.json)
 * - The relationship graph (graph.json)
 *
 * When `force` is enabled and the target agent exists, the import uses the
 * 'replace' strategy to overwrite existing memories. Otherwise, existing
 * memories in the target are skipped.
 *
 * The function supports dry-run mode which validates inputs and counts memories
 * without actually performing the copy.
 *
 * @param request - The agent copy request containing:
 *   - `source` - The name of the agent to copy from
 *   - `target` - The name of the new agent to create
 *   - `scope` - The scope for both agents (AgentProject or AgentGlobal)
 *   - `projectRoot` - The project root directory path
 *   - `globalRoot` - The global memory root directory path
 *   - `force` - Optional flag to overwrite existing target agent
 *   - `dryRun` - Optional flag to simulate copying without side effects
 *
 * @returns A promise resolving to {@link CopyAgentResponse} containing:
 *   - `status` - Always 'success' if no error thrown
 *   - `source` - The source agent name (normalised)
 *   - `target` - The target agent name (normalised)
 *   - `memoriesCopied` - Number of memories copied to the target
 *   - `dryRun` - Boolean indicating if this was a dry-run operation
 *
 * @throws {Error} When source or target agent name is empty
 * @throws {Error} When the source agent does not exist
 * @throws {Error} When the target agent exists and `force` is not enabled
 * @throws {Error} When exporting memories from the source fails
 * @throws {Error} When importing memories to the target fails
 *
 * @example
 * // Copy an agent to create a variant
 * const result = await copyAgent({
 *   source: 'typescript-expert',
 *   target: 'typescript-experimental',
 *   scope: Scope.AgentProject,
 *   projectRoot: '/home/user/project',
 *   globalRoot: '/home/user/.claude/memory',
 * });
 * console.log(`Copied ${result.memoriesCopied} memories to new agent`);
 *
 * @example
 * // Force-copy to overwrite an existing agent
 * const result = await copyAgent({
 *   source: 'production-agent',
 *   target: 'backup-agent',
 *   scope: Scope.AgentGlobal,
 *   projectRoot: '/home/user/project',
 *   globalRoot: '/home/user/.claude/memory',
 *   force: true,
 * });
 *
 * @example
 * // Dry-run to preview copy operation
 * const dryRunResult = await copyAgent({
 *   source: 'my-agent',
 *   target: 'my-agent-copy',
 *   scope: Scope.AgentProject,
 *   projectRoot: '/home/user/project',
 *   globalRoot: '/home/user/.claude/memory',
 *   dryRun: true,
 * });
 * console.log(`Would copy ${dryRunResult.memoriesCopied} memories`);
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
