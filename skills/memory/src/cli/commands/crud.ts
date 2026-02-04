/**
 * CLI Commands: CRUD Operations
 *
 * Handlers for write, read, list, delete, search, semantic commands.
 */

import type { ParsedArgs } from '../parser.js';
import { readStdinJson, getFlagString, getFlagBool, getFlagNumber } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import type { WriteMemoryRequest } from '../../types/api.js';
import { writeMemory } from '../../core/write.js';
import { readMemory } from '../../core/read.js';
import { listMemories } from '../../core/list.js';
import { deleteMemory } from '../../core/delete.js';
import { searchMemories } from '../../core/search.js';
import { semanticSearchMemories } from '../../core/semantic-search.js';
import { createOllamaProviderWithHealthCheck } from '../../search/embedding.js';
import { MemoryType } from '../../types/enums.js';
import { getResolvedScopePath, parseScope, parseMemoryType, resolveAgentScopePath, validateIncludeShared } from '../helpers.js';

/**
 * write - Create or update a memory from stdin JSON
 *
 * Usage: echo '{"title":"...", "content":"...", ...}' | memory write [--auto-link] [--agent <name>]
 */
export async function cmdWrite(args: ParsedArgs): Promise<CliResponse> {
  const input = await readStdinJson<Partial<WriteMemoryRequest>>();

  if (!input) {
    return error('No JSON input provided. Pipe JSON to stdin.');
  }

  if (!input.title) {
    return error('Missing required field: title');
  }

  if (!input.content) {
    return error('Missing required field: content');
  }

  // Extract agent name if provided
  const agentName = getFlagString(args.flags, 'agent');
  const scopeStr = getFlagString(args.flags, 'scope') ?? (input.scope as string | undefined);

  // Validate --include-shared flag (write operations are single-scope only)
  const includeShared = getFlagBool(args.flags, 'include-shared');
  if (includeShared) {
    return error('Error: write operations are single-scope only. Remove --include-shared flag.');
  }

  // Choose helper based on agent context
  const basePath = agentName
    ? resolveAgentScopePath(agentName, scopeStr)
    : getResolvedScopePath(parseScope(scopeStr));

  // Parse type - default to Decision if not specified
  const typeStr = getFlagString(args.flags, 'type') ?? (input.type as string | undefined);
  const type = parseMemoryType(typeStr) ?? MemoryType.Decision;

  const autoLink = getFlagBool(args.flags, 'auto-link') || input.autoLink;

  const request: WriteMemoryRequest = {
    id: input.id,  // Pass custom ID if provided (validation in writeMemory)
    title: input.title,
    content: input.content,
    type,
    scope: parseScope(scopeStr),
    tags: input.tags ?? [],
    severity: input.severity,
    links: input.links,
    source: input.source,
    meta: input.meta,
    autoLink,
    autoLinkThreshold: getFlagNumber(args.flags, 'auto-link-threshold') ?? input.autoLinkThreshold,
    // Always attempt embedding generation (graceful fallback if Ollama unavailable)
    embeddingProvider: await createOllamaProviderWithHealthCheck(),
    basePath,
    agent: agentName,  // Pass agent to storage layer
  };

  return wrapOperation(
    async () => {
      const result = await writeMemory(request);
      return result;
    },
    'Memory written successfully'
  );
}

/**
 * read - Read a memory by ID
 *
 * Usage: memory read <id> [--scope <scope>] [--agent <name>]
 */
export async function cmdRead(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];

  if (!id) {
    return error('Missing required argument: id');
  }

  // Extract agent name if provided
  const agentName = getFlagString(args.flags, 'agent');
  const scopeStr = getFlagString(args.flags, 'scope');

  // Choose helper based on agent context
  const basePath = agentName
    ? resolveAgentScopePath(agentName, scopeStr)
    : getResolvedScopePath(parseScope(scopeStr));

  return wrapOperation(
    async () => {
      const result = await readMemory({ id, basePath, agent: agentName });
      return result;
    },
    `Read memory: ${id}`
  );
}

/**
 * list - List memories with optional filters
 *
 * Usage: memory list [type] [tag] [--scope <scope>] [--limit <n>] [--agent <name>] [--include-shared]
 */
export async function cmdList(args: ParsedArgs): Promise<CliResponse> {
  const typeArg = args.positional[0];
  const tagArg = args.positional[1];

  // Extract agent name if provided
  const agentName = getFlagString(args.flags, 'agent');
  const scopeStr = getFlagString(args.flags, 'scope');

  // Validate --include-shared flag
  const includeShared = getFlagBool(args.flags, 'include-shared');
  const validation = validateIncludeShared(includeShared, agentName);
  if (!validation.valid) {
    return error(validation.error!);
  }

  // Choose helper based on agent context
  const basePath = agentName
    ? resolveAgentScopePath(agentName, scopeStr)
    : getResolvedScopePath(parseScope(scopeStr));

  const limit = getFlagNumber(args.flags, 'limit');
  const type = parseMemoryType(typeArg);

  return wrapOperation(
    async () => {
      const result = await listMemories({
        basePath,
        type,
        tag: tagArg,
        limit,
        agent: agentName,
      });
      return result;
    },
    'Listed memories'
  );
}

/**
 * delete - Delete a memory
 *
 * Usage: memory delete <id> [--scope <scope>] [--force] [--agent <name>]
 */
export async function cmdDelete(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];

  if (!id) {
    return error('Missing required argument: id');
  }

  // Extract agent name if provided
  const agentName = getFlagString(args.flags, 'agent');
  const scopeStr = getFlagString(args.flags, 'scope');

  // Validate --include-shared flag (write operations are single-scope only)
  const includeShared = getFlagBool(args.flags, 'include-shared');
  if (includeShared) {
    return error('Error: write operations are single-scope only. Remove --include-shared flag.');
  }

  // Choose helper based on agent context
  const basePath = agentName
    ? resolveAgentScopePath(agentName, scopeStr)
    : getResolvedScopePath(parseScope(scopeStr));

  return wrapOperation(
    async () => {
      const result = await deleteMemory({ id, basePath, agent: agentName });
      return result;
    },
    `Deleted memory: ${id}`
  );
}

/**
 * search - Full-text search across memories
 *
 * Usage: memory search <query> [--scope <scope>] [--limit <n>] [--type <type>] [--agent <name>] [--include-shared]
 */
export async function cmdSearch(args: ParsedArgs): Promise<CliResponse> {
  const query = args.positional[0];

  if (!query) {
    return error('Missing required argument: query');
  }

  // Extract agent name if provided
  const agentName = getFlagString(args.flags, 'agent');
  const scopeStr = getFlagString(args.flags, 'scope');

  // Validate --include-shared flag
  const includeShared = getFlagBool(args.flags, 'include-shared');
  const validation = validateIncludeShared(includeShared, agentName);
  if (!validation.valid) {
    return error(validation.error!);
  }

  // Choose helper based on agent context
  const basePath = agentName
    ? resolveAgentScopePath(agentName, scopeStr)
    : getResolvedScopePath(parseScope(scopeStr));

  const limit = getFlagNumber(args.flags, 'limit');
  const type = parseMemoryType(getFlagString(args.flags, 'type'));

  return wrapOperation(
    async () => {
      const result = await searchMemories({
        query,
        basePath,
        limit,
        type,
        agent: agentName,
      });
      return result;
    },
    `Found matches for: ${query}`
  );
}

/**
 * semantic - Search by meaning using embeddings
 *
 * Usage: memory semantic <query> [--scope <scope>] [--threshold <n>] [--limit <n>] [--agent <name>] [--include-shared]
 */
export async function cmdSemantic(args: ParsedArgs): Promise<CliResponse> {
  const query = args.positional[0];

  if (!query) {
    return error('Missing required argument: query');
  }

  // Extract agent name if provided
  const agentName = getFlagString(args.flags, 'agent');
  const scopeStr = getFlagString(args.flags, 'scope');

  // Validate --include-shared flag
  const includeShared = getFlagBool(args.flags, 'include-shared');
  const validation = validateIncludeShared(includeShared, agentName);
  if (!validation.valid) {
    return error(validation.error!);
  }

  // Choose helper based on agent context
  const basePath = agentName
    ? resolveAgentScopePath(agentName, scopeStr)
    : getResolvedScopePath(parseScope(scopeStr));

  const threshold = getFlagNumber(args.flags, 'threshold') ?? 0.5;
  const limit = getFlagNumber(args.flags, 'limit') ?? 10;

  // Create Ollama embedding provider (required for semantic search)
  const provider = await createOllamaProviderWithHealthCheck();
  if (!provider) {
    return error(
      'Semantic search requires Ollama with the embeddinggemma:latest model.\n' +
      '\n' +
      'Setup instructions:\n' +
      '  1. Install Ollama: https://ollama.ai/download\n' +
      '  2. Start Ollama service\n' +
      '  3. Pull the model: ollama pull embeddinggemma:latest\n' +
      '\n' +
      'If already installed, ensure Ollama is running on http://localhost:11434'
    );
  }

  return wrapOperation(
    async () => {
      const result = await semanticSearchMemories({
        query,
        basePath,
        threshold,
        agent: agentName,
        limit,
        provider,
      });
      return result;
    },
    `Semantic search for: ${query}`
  );
}
