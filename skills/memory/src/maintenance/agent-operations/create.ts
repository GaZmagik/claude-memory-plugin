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
 * Creates a new agent with proper directory structure and initialisation.
 *
 * This function performs the following operations:
 * 1. Validates and normalises the agent name (trims whitespace, converts to lowercase)
 * 2. Checks that the agent name follows kebab-case format
 * 3. Verifies the agent does not already exist at the target scope
 * 4. Creates the agent directory structure
 * 5. Initialises an empty index.json for memory tracking
 * 6. Initialises an empty graph.json for relationship tracking
 *
 * The function supports dry-run mode which validates inputs and returns what would
 * be created without actually creating the agent.
 *
 * @param request - The agent creation request containing:
 *   - `name` - The desired agent name (will be normalised to lowercase kebab-case)
 *   - `scope` - The scope for the agent (AgentProject or AgentGlobal)
 *   - `projectRoot` - The project root directory path
 *   - `globalRoot` - The global memory root directory path
 *   - `dryRun` - Optional flag to simulate creation without side effects
 *
 * @returns A promise resolving to {@link CreateAgentResponse} containing:
 *   - `status` - Always 'success' if no error thrown
 *   - `agent` - Object with the created agent's name, scope, and path
 *   - `dryRun` - Boolean indicating if this was a dry-run operation
 *
 * @throws {Error} When agent name is empty after trimming
 * @throws {Error} When agent name format is invalid (must be kebab-case)
 * @throws {Error} When an agent with the same name already exists at the target scope
 *
 * @example
 * // Create a project-scoped agent
 * const result = await createAgent({
 *   name: 'typescript-expert',
 *   scope: Scope.AgentProject,
 *   projectRoot: '/home/user/project',
 *   globalRoot: '/home/user/.claude/memory',
 * });
 * console.log(result.agent.path); // '/home/user/project/.claude/memory/agents/typescript-expert'
 *
 * @example
 * // Dry-run to check if creation would succeed
 * const dryRunResult = await createAgent({
 *   name: 'my-agent',
 *   scope: Scope.AgentGlobal,
 *   projectRoot: '/home/user/project',
 *   globalRoot: '/home/user/.claude/memory',
 *   dryRun: true,
 * });
 * if (dryRunResult.status === 'success') {
 *   console.log('Agent can be created at:', dryRunResult.agent.path);
 * }
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
