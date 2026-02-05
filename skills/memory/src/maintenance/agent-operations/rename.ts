/**
 * Agent renaming operations
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getAgentDirectoryPath } from '../../scope/get-agent-directory-path.js';
import { agentDirectoryExists } from '../../storage/agent-directory-exists.js';
import { loadIndex } from '../../core/index.js';
import { parseMemoryFile, serialiseMemoryFile } from '../../core/frontmatter.js';
import type { RenameAgentRequest, RenameAgentResponse } from './types.js';
import { Scope } from '../../types/enums.js';

/**
 * Renames an agent
 *
 * @param request - Agent rename request
 * @returns Success response with rename summary
 * @throws Error if old name not found or new name exists
 *
 * @example
 * await renameAgent({
 *   oldName: 'typescript-expert',
 *   newName: 'typescript-pro',
 *   scope: Scope.AgentProject,
 *   projectRoot: '/home/user/project',
 *   globalRoot: '/home/user/.claude/memory',
 * });
 */
export async function renameAgent(request: RenameAgentRequest): Promise<RenameAgentResponse> {
  const oldName = request.oldName.trim().toLowerCase();
  const newName = request.newName.trim().toLowerCase();

  if (!oldName || !newName) {
    throw new Error('Old and new agent names cannot be empty');
  }

  // Check if old agent exists
  const agentScope = request.scope as Scope.AgentProject | Scope.AgentGlobal;
  const oldExists = await agentDirectoryExists(
    agentScope,
    oldName,
    request.projectRoot,
    request.globalRoot
  );

  if (!oldExists) {
    throw new Error(`Agent not found: ${oldName}`);
  }

  // Check if new name already exists
  const newExists = await agentDirectoryExists(
    agentScope,
    newName,
    request.projectRoot,
    request.globalRoot
  );

  if (newExists) {
    throw new Error(`Target agent already exists: ${newName}`);
  }

  // Get old and new paths
  const oldPath = getAgentDirectoryPath({
    scope: request.scope,
    agentName: oldName,
    projectRoot: request.projectRoot,
    globalRoot: request.globalRoot,
  });

  const newPath = getAgentDirectoryPath({
    scope: request.scope,
    agentName: newName,
    projectRoot: request.projectRoot,
    globalRoot: request.globalRoot,
  });

  // Load index to count memories
  const index = await loadIndex({ basePath: oldPath });
  const memoryCount = index.memories.length;

  // Early return for dry-run
  if (request.dryRun) {
    return {
      status: 'success',
      oldName,
      newName,
      memoriesUpdated: memoryCount,
      dryRun: true,
    };
  }

  // Rename directory at filesystem level
  await fs.rename(oldPath, newPath);

  // Update agent field in all memory frontmatter
  let updatedCount = 0;
  for (const memory of index.memories) {
    const filePath = path.join(newPath, memory.relativePath);

    try {
      // Read memory file
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parsed = parseMemoryFile(fileContent);

      // Update agent field
      parsed.frontmatter.agent = newName;

      // Write back
      const updated = serialiseMemoryFile(parsed.frontmatter, parsed.content);
      await fs.writeFile(filePath, updated, 'utf-8');

      updatedCount++;
    } catch (error) {
      // Log but continue with other files
      console.error(`Failed to update ${memory.id}:`, error);
    }
  }

  return {
    status: 'success',
    oldName,
    newName,
    memoriesUpdated: updatedCount,
    dryRun: false,
  };
}
