/**
 * T029: Memory Read Operation
 *
 * Read memory files by ID.
 */

import * as path from 'node:path';
import * as os from 'node:os';
import type { ReadMemoryRequest, ReadMemoryResponse } from '../types/api.js';
import { Scope } from '../types/enums.js';
import { findInIndex } from './index.js';
import { readFile, fileExists, isInsideDir } from './fs-utils.js';
import { parseMemoryFile } from './frontmatter.js';
import { createLogger } from './logger.js';
import { getAgentDirectoryPath } from '../scope/get-agent-directory-path.js';
import { isAgentScope } from '../scope/is-agent-scope.js';

const log = createLogger('read');

/**
 * Read a memory by ID.
 *
 * Retrieves a memory file, parses its YAML frontmatter and markdown content,
 * and returns the complete memory data. First attempts to locate the memory
 * via the index, then falls back to direct file lookup.
 *
 * Supports both traditional scopes (project, global, local) and agent scopes
 * (agent-project, agent-global). When using agent scopes:
 *
 * - Requires `request.agent` to specify the agent name
 * - Agent-project scope: reads from project's `.claude/memory/agents/<name>/`
 * - Agent-global scope: reads from user's `~/.claude/memory/agents/<name>/`
 *
 * @param request - Read request containing the memory ID
 * @param request.id - The ID of the memory to read (required)
 * @param request.basePath - Base path for memory storage (defaults to cwd)
 * @param request.scope - Scope where memory is located (optional, helps with agent scopes)
 * @param request.agent - Agent name (required for agent scopes)
 *
 * @returns {Promise<ReadMemoryResponse>} Response object containing:
 *   - `status`: 'success' or 'error'
 *   - `memory`: Object with frontmatter, content, and filePath (on success)
 *   - `error`: Error message if status is 'error'
 *
 * @throws Never throws directly; errors are returned in the response object
 *
 * @example
 * // Read a memory from project scope
 * const result = await readMemory({
 *   id: 'learning-typescript-generics-abc123',
 *   basePath: '/path/to/project/.claude/memory'
 * });
 * if (result.status === 'success') {
 *   console.log(`Title: ${result.memory.frontmatter.title}`);
 *   console.log(`Content: ${result.memory.content}`);
 *   console.log(`Tags: ${result.memory.frontmatter.tags.join(', ')}`);
 * }
 *
 * @example
 * // Read a memory from an agent's global scope
 * const result = await readMemory({
 *   id: 'decision-api-versioning-ghi789',
 *   scope: Scope.AgentGlobal,
 *   agent: 'api-architect'
 * });
 */
export async function readMemory(request: ReadMemoryRequest): Promise<ReadMemoryResponse> {
  // Validate ID
  if (!request.id || request.id.trim().length === 0) {
    return {
      status: 'error',
      error: 'id is required',
    };
  }

  // Resolve base path (handle agent scopes)
  let basePath: string;
  if (request.scope && isAgentScope(request.scope)) {
    // Agent scope - resolve agent directory
    if (!request.agent) {
      return {
        status: 'error',
        error: 'agent field is required for agent scopes',
      };
    }

    const projectRoot = request.scope === Scope.AgentProject ? process.cwd() : undefined;
    const globalRoot = request.scope === Scope.AgentGlobal ? (request.basePath ?? path.join(os.homedir(), '.claude', 'memory')) : undefined;

    basePath = getAgentDirectoryPath({
      scope: request.scope,
      agentName: request.agent,
      projectRoot,
      globalRoot,
    });
  } else {
    // Regular scope - use existing resolution
    basePath = request.basePath ?? process.cwd();
  }

  try {
    // Try to find in index first
    const indexEntry = await findInIndex(basePath, request.id);

    let filePath: string;

    if (indexEntry) {
      filePath = path.join(basePath, indexEntry.relativePath);
    } else {
      // Fall back to direct file lookup
      filePath = path.join(basePath, `${request.id}.md`);
    }

    // Security: Validate path stays within basePath (prevent path traversal)
    if (!isInsideDir(basePath, filePath)) {
      log.warn('Path traversal attempt detected', { id: request.id, filePath });
      return {
        status: 'error',
        error: 'Invalid memory ID: path traversal not allowed',
      };
    }

    if (!(await fileExists(filePath))) {
      return {
        status: 'error',
        error: `Memory not found: ${request.id}`,
      };
    }

    // Read and parse file
    const fileContent = await readFile(filePath);
    const { frontmatter, content } = parseMemoryFile(fileContent);

    log.debug('Read memory', { id: request.id, path: filePath });

    return {
      status: 'success',
      memory: {
        frontmatter,
        content,
        filePath,
      },
    };
  } catch (error) {
    log.error('Failed to read memory', { id: request.id, error: String(error) });
    return {
      status: 'error',
      error: `Failed to read memory: ${String(error)}`,
    };
  }
}
