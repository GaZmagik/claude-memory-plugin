/**
 * Agent creation operations
 */

import { validateAgentName } from '../../scope/validate-agent-name.js';
import { getAgentDirectoryPath } from '../../scope/get-agent-directory-path.js';
import { agentDirectoryExists } from '../../storage/agent-directory-exists.js';
import { createAgentDirectory } from '../../storage/create-agent-directory.js';
import { createEmptyIndex } from '../../core/index.js';
import { saveIndex } from '../../core/index.js';
import { createGraph } from '../../graph/structure.js';
import { saveGraph } from '../../graph/structure.js';
import type { CreateAgentRequest, CreateAgentResponse } from './types.js';
import { Scope } from '../../types/enums.js';

/**
 * Creates a new agent with proper directory structure and initialisation
 *
 * @param request - Agent creation request
 * @returns Success response with agent details
 * @throws Error if agent name is invalid or agent already exists
 *
 * @example
 * await createAgent({
 *   name: 'typescript-expert',
 *   scope: Scope.AgentProject,
 *   projectRoot: '/home/user/project/.claude/memory',
 *   globalRoot: '/home/user/.claude/memory',
 * });
 */
export async function createAgent(request: CreateAgentRequest): Promise<CreateAgentResponse> {
  // Trim and lowercase agent name
  const agentName = request.name.trim().toLowerCase();

  if (!agentName) {
    throw new Error('Invalid agent name: cannot be empty');
  }

  // Validate format
  const validation = validateAgentName(agentName);

  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid agent name');
  }

  // Check if agent already exists
  const agentScope = request.scope as Scope.AgentProject | Scope.AgentGlobal;
  const exists = await agentDirectoryExists(
    agentScope,
    agentName,
    request.projectRoot,
    request.globalRoot
  );

  if (exists) {
    throw new Error(`Agent already exists: ${agentName}`);
  }

  // Get agent directory path for response
  const agentPath = getAgentDirectoryPath({
    scope: request.scope,
    agentName: agentName,
    projectRoot: request.projectRoot,
    globalRoot: request.globalRoot,
  });

  // Early return for dry-run
  if (request.dryRun) {
    return {
      status: 'success',
      agent: {
        name: agentName,
        scope: request.scope,
        path: agentPath,
      },
      dryRun: true,
    };
  }

  // Create directory structure
  await createAgentDirectory(
    agentScope,
    agentName,
    request.projectRoot,
    request.globalRoot
  );

  // Initialize index.json
  const emptyIndex = createEmptyIndex();
  await saveIndex(agentPath, emptyIndex);

  // Initialize graph.json
  const emptyGraph = createGraph();
  await saveGraph(agentPath, emptyGraph);

  return {
    status: 'success',
    agent: {
      name: agentName,
      scope: request.scope,
      path: agentPath,
    },
    dryRun: false,
  };
}
