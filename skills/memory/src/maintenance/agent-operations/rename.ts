/**
 * Agent renaming operations
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getAgentDirectoryPath } from '../../scope/get-agent-directory-path.js';
import { agentDirectoryExists } from '../../storage/agent-directory-exists.js';
import { validateAgentName } from '../../scope/validate-agent-name.js';
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

  // Validate new name format and reserved names
  const validation = validateAgentName(newName);
  if (!validation.valid) {
    throw new Error(`Invalid new agent name: ${validation.error}`);
  }

  // Pre-flight checks for existence
  // Note: These checks are subject to TOCTOU race conditions. The actual
  // fs.rename() call is the authoritative operation - these checks provide
  // better error messages but cannot guarantee atomicity. If another process
  // modifies the filesystem between check and rename, fs.rename will fail
  // with an appropriate error (ENOENT or EEXIST).
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

  // Update agent field in all memory frontmatter (in parallel)
  const updateResults = await Promise.all(
    index.memories.map(async (memory) => {
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

        return { success: true, id: memory.id };
      } catch (error) {
        // Log but continue with other files
        console.error(`Failed to update ${memory.id}:`, error);
        return { success: false, id: memory.id };
      }
    })
  );

  const updatedCount = updateResults.filter(r => r.success).length;

  return {
    status: 'success',
    oldName,
    newName,
    memoriesUpdated: updatedCount,
    dryRun: false,
  };
}
