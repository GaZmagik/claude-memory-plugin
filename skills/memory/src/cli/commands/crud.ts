/**
 * CLI Commands: CRUD Operations
 *
 * Handlers for write, read, list, delete, search, semantic commands.
 */

import type { ParsedArgs } from '../parser.js';
import { readStdinJson, getFlagString, getFlagBool, getFlagNumber } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import type { WriteMemoryRequest, MemorySummary, SearchResult, SemanticSearchResultItem } from '../../types/api.js';
import { writeMemory } from '../../core/write.js';
import { readMemory } from '../../core/read.js';
import { listMemories } from '../../core/list.js';
import { deleteMemory } from '../../core/delete.js';
import { searchMemories } from '../../core/search.js';
import { semanticSearchMemories } from '../../core/semantic-search.js';
import { createOllamaProviderWithHealthCheck } from '../../search/embedding.js';
import { MemoryType } from '../../types/enums.js';
import { getResolvedScopePath, parseScope, parseMemoryType, resolveAgentScopePath, validateIncludeShared, resolveSharedScopePaths, getGlobalMemoryPath } from '../helpers.js';
import { getScopeNameFromPath, formatScopedResult } from '../../core/scope-indicators.js';
import { discoverAgents } from '../../core/agent-discovery.js';
import { getAgentDirectoryPath } from '../../scope/get-agent-directory-path.js';

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
    ? await resolveAgentScopePath(agentName, scopeStr)
    : await getResolvedScopePath(parseScope(scopeStr));

  // Read-only guard: Reject writes to external nodes (rule/reminder types)
  if (input.id) {
    const { loadIndex } = await import('../../core/index.js');
    const index = await loadIndex({ basePath });
    const existingEntry = index.memories.find(m => m.id === input.id);

    if (existingEntry && (existingEntry.type === MemoryType.Rule || existingEntry.type === MemoryType.Reminder)) {
      return error(`'${input.id}' is a read-only external node. Run 'memory sync' to refresh it.`);
    }
  }

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
    ? await resolveAgentScopePath(agentName, scopeStr)
    : await getResolvedScopePath(parseScope(scopeStr));

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

  const limit = getFlagNumber(args.flags, 'limit');
  const type = parseMemoryType(typeArg);

  return wrapOperation(
    async () => {
      // Multi-scope list if --include-shared is used with --agent
      if (includeShared && agentName) {
        const scopePaths = await resolveSharedScopePaths(agentName, scopeStr);
        const allResults: Array<{ scope: string; memories: MemorySummary[] }> = [];

        // List across all scope paths
        for (const scopePath of scopePaths) {
          const scopeName = getScopeNameFromPath(scopePath);
          const scopeResult = await listMemories({
            basePath: scopePath,
            type,
            tag: tagArg,
            limit,
            agent: agentName,
          });

          if (scopeResult.status === 'success' && scopeResult.memories) {
            allResults.push({ scope: scopeName, memories: scopeResult.memories });
          }
        }

        // Merge results with scope indicators
        const mergedMemories = allResults.flatMap(({ scope, memories }) =>
          memories.map((memory: MemorySummary) => ({
            ...memory,
            id: formatScopedResult(memory.id, scope),
            scope, // Add scope field for reference
          }))
        );

        // Apply limit across all results
        const limitedMemories = limit ? mergedMemories.slice(0, limit) : mergedMemories;

        return {
          status: 'success',
          memories: limitedMemories,
          count: mergedMemories.length,
          scopes: allResults.map(({ scope }) => scope),
        };
      }

      // Single-scope list (existing behavior)
      const basePath = agentName
        ? await resolveAgentScopePath(agentName, scopeStr)
        : await getResolvedScopePath(parseScope(scopeStr));

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
    ? await resolveAgentScopePath(agentName, scopeStr)
    : await getResolvedScopePath(parseScope(scopeStr));

  // Read-only guard: Reject deletes on external nodes (rule/reminder types)
  const { loadIndex } = await import('../../core/index.js');
  const index = await loadIndex({ basePath });
  const existingEntry = index.memories.find(m => m.id === id);

  if (existingEntry && (existingEntry.type === MemoryType.Rule || existingEntry.type === MemoryType.Reminder)) {
    return error(`'${id}' is a read-only external node. Run 'memory sync' to refresh it.`);
  }

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
  const allAgents = getFlagBool(args.flags, 'all-agents');

  // Validate mutually exclusive flags
  if (allAgents && agentName) {
    return error('Cannot use --all-agents with --agent');
  }

  // Validate --include-shared flag
  const includeShared = getFlagBool(args.flags, 'include-shared');

  if (allAgents && includeShared) {
    return error('Cannot use --all-agents with --include-shared');
  }

  const validation = validateIncludeShared(includeShared, agentName);
  if (!validation.valid) {
    return error(validation.error!);
  }

  const limit = getFlagNumber(args.flags, 'limit');
  const type = parseMemoryType(getFlagString(args.flags, 'type'));

  return wrapOperation(
    async () => {
      // Cross-agent search if --all-agents is used
      if (allAgents) {
        const agents = await discoverAgents({
          projectRoot: process.cwd(),
          globalRoot: getGlobalMemoryPath(),
        });

        const allResults: Array<{ agent: string; results: SearchResult[] }> = [];

        // Search across all agents
        for (const agent of agents) {
          const agentPath = getAgentDirectoryPath({
            scope: agent.scope,
            agentName: agent.name,
            projectRoot: process.cwd(),
            globalRoot: getGlobalMemoryPath(),
          });

          const agentResult = await searchMemories({
            query,
            basePath: agentPath,
            limit,
            type,
            agent: agent.name,
          });

          if (agentResult.status === 'success' && agentResult.results) {
            allResults.push({ agent: agent.name, results: agentResult.results });
          }
        }

        // Merge results with agent indicators
        const mergedResults = allResults.flatMap(({ agent, results }) =>
          results.map((result: SearchResult) => ({
            ...result,
            id: formatScopedResult(result.id, `agent:${agent}`),
            agent, // Add agent field for reference
          }))
        );

        // Apply limit across all results
        const limitedResults = limit ? mergedResults.slice(0, limit) : mergedResults;

        return {
          status: 'success',
          results: limitedResults,
          total: mergedResults.length,
          agents: allResults.map(({ agent }) => agent),
        };
      }

      // Multi-scope search if --include-shared is used with --agent
      if (includeShared && agentName) {
        const scopePaths = await resolveSharedScopePaths(agentName, scopeStr);
        const allResults: Array<{ scope: string; results: SearchResult[] }> = [];

        // Search across all scope paths
        for (const scopePath of scopePaths) {
          const scopeName = getScopeNameFromPath(scopePath);
          const scopeResult = await searchMemories({
            query,
            basePath: scopePath,
            limit,
            type,
            agent: agentName,
          });

          if (scopeResult.status === 'success' && scopeResult.results) {
            allResults.push({ scope: scopeName, results: scopeResult.results });
          }
        }

        // Merge results with scope indicators
        const mergedResults = allResults.flatMap(({ scope, results }) =>
          results.map((result: SearchResult) => ({
            ...result,
            id: formatScopedResult(result.id, scope),
            scope, // Add scope field for reference
          }))
        );

        // Apply limit across all results
        const limitedResults = limit ? mergedResults.slice(0, limit) : mergedResults;

        return {
          status: 'success',
          results: limitedResults,
          total: mergedResults.length,
          scopes: allResults.map(({ scope }) => scope),
        };
      }

      // Single-scope search (existing behavior)
      const basePath = agentName
        ? await resolveAgentScopePath(agentName, scopeStr)
        : await getResolvedScopePath(parseScope(scopeStr));

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
      // Multi-scope semantic search if --include-shared is used with --agent
      if (includeShared && agentName) {
        const scopePaths = await resolveSharedScopePaths(agentName, scopeStr);
        const allResults: Array<{ scope: string; results: SemanticSearchResultItem[] }> = [];

        // Search across all scope paths
        for (const scopePath of scopePaths) {
          const scopeName = getScopeNameFromPath(scopePath);
          const scopeResult = await semanticSearchMemories({
            query,
            basePath: scopePath,
            threshold,
            agent: agentName,
            limit,
            provider,
          });

          if (scopeResult.status === 'success' && scopeResult.results) {
            allResults.push({ scope: scopeName, results: scopeResult.results });
          }
        }

        // Merge results with scope indicators
        const mergedResults = allResults.flatMap(({ scope, results }) =>
          results.map((result: SemanticSearchResultItem) => ({
            ...result,
            id: formatScopedResult(result.id, scope),
            scope, // Add scope field for reference
          }))
        );

        // Sort by similarity and apply limit
        mergedResults.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        const limitedResults = limit ? mergedResults.slice(0, limit) : mergedResults;

        return {
          status: 'success',
          results: limitedResults,
          total: mergedResults.length,
          scopes: allResults.map(({ scope }) => scope),
        };
      }

      // Single-scope semantic search (existing behavior)
      const basePath = agentName
        ? await resolveAgentScopePath(agentName, scopeStr)
        : await getResolvedScopePath(parseScope(scopeStr));

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
