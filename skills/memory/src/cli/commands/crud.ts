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
import { createOllamaProvider } from '../../search/embedding.js';
import { MemoryType } from '../../types/enums.js';
import { getResolvedScopePath, parseScope, parseMemoryType } from '../helpers.js';

/**
 * write - Create or update a memory from stdin JSON
 *
 * Usage: echo '{"title":"...", "content":"...", ...}' | memory write [--auto-link]
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

  const scopeStr = getFlagString(args.flags, 'scope') ?? (input.scope as string | undefined);
  const scope = parseScope(scopeStr);
  const basePath = getResolvedScopePath(scope);

  // Parse type - default to Decision if not specified
  const typeStr = getFlagString(args.flags, 'type') ?? (input.type as string | undefined);
  const type = parseMemoryType(typeStr) ?? MemoryType.Decision;

  const autoLink = getFlagBool(args.flags, 'auto-link') || input.autoLink;

  const request: WriteMemoryRequest = {
    id: input.id,  // Pass custom ID if provided (validation in writeMemory)
    title: input.title,
    content: input.content,
    type,
    scope,
    tags: input.tags ?? [],
    severity: input.severity,
    links: input.links,
    source: input.source,
    meta: input.meta,
    autoLink,
    autoLinkThreshold: getFlagNumber(args.flags, 'auto-link-threshold') ?? input.autoLinkThreshold,
    // Inject Ollama provider when auto-link requested (for embedding generation)
    embeddingProvider: autoLink ? createOllamaProvider() : undefined,
    basePath,
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
 * Usage: memory read <id> [--scope <scope>]
 */
export async function cmdRead(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];

  if (!id) {
    return error('Missing required argument: id');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const result = await readMemory({ id, basePath });
      return result;
    },
    `Read memory: ${id}`
  );
}

/**
 * list - List memories with optional filters
 *
 * Usage: memory list [type] [tag] [--scope <scope>] [--limit <n>]
 */
export async function cmdList(args: ParsedArgs): Promise<CliResponse> {
  const typeArg = args.positional[0];
  const tagArg = args.positional[1];

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const limit = getFlagNumber(args.flags, 'limit');
  const type = parseMemoryType(typeArg);

  return wrapOperation(
    async () => {
      const result = await listMemories({
        basePath,
        type,
        tag: tagArg,
        limit,
      });
      return result;
    },
    'Listed memories'
  );
}

/**
 * delete - Delete a memory
 *
 * Usage: memory delete <id> [--scope <scope>] [--force]
 */
export async function cmdDelete(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];

  if (!id) {
    return error('Missing required argument: id');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const result = await deleteMemory({ id, basePath });
      return result;
    },
    `Deleted memory: ${id}`
  );
}

/**
 * search - Full-text search across memories
 *
 * Usage: memory search <query> [--scope <scope>] [--limit <n>] [--type <type>]
 */
export async function cmdSearch(args: ParsedArgs): Promise<CliResponse> {
  const query = args.positional[0];

  if (!query) {
    return error('Missing required argument: query');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const limit = getFlagNumber(args.flags, 'limit');
  const type = parseMemoryType(getFlagString(args.flags, 'type'));

  return wrapOperation(
    async () => {
      const result = await searchMemories({
        query,
        basePath,
        limit,
        type,
      });
      return result;
    },
    `Found matches for: ${query}`
  );
}

/**
 * semantic - Search by meaning using embeddings
 *
 * Usage: memory semantic <query> [--scope <scope>] [--threshold <n>] [--limit <n>]
 */
export async function cmdSemantic(args: ParsedArgs): Promise<CliResponse> {
  const query = args.positional[0];

  if (!query) {
    return error('Missing required argument: query');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const threshold = getFlagNumber(args.flags, 'threshold') ?? 0.5;
  const limit = getFlagNumber(args.flags, 'limit') ?? 10;

  // Create Ollama embedding provider
  const provider = createOllamaProvider();

  return wrapOperation(
    async () => {
      const result = await semanticSearchMemories({
        query,
        basePath,
        threshold,
        limit,
        provider,
      });
      return result;
    },
    `Semantic search for: ${query}`
  );
}
