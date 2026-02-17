/**
 * CLI Commands: Suggestion Operations
 *
 * Handlers for suggest-links and summarize commands.
 * Note: These are stubs pending Phase 6 implementation.
 */

import type { ParsedArgs } from '../parser.js';
import { getFlagString, getFlagNumber, getFlagBool } from '../parser.js';
import type { CliResponse } from '../response.js';
import { success, wrapOperation, error } from '../response.js';
import { suggestLinks } from '../../suggest/suggest-links.js';
import { getResolvedScopePath, parseScope, resolveAgentScopePath, validateIncludeShared } from '../helpers.js';

/**
 * suggest-links - Suggest potential relationships using embeddings
 *
 * Usage: memory suggest-links [--threshold <n>] [--limit <n>] [--auto-link] [--scope <scope>] [--agent <agent>] [--include-shared]
 *
 * Uses semantic similarity to find memories that might be related.
 * Requires embeddings cache (generated via semantic search).
 */
export async function cmdSuggestLinks(args: ParsedArgs): Promise<CliResponse> {
  const scopeStr = getFlagString(args.flags, 'scope');
  
  // Parse agent, include-shared, and all-scopes flags
  const agentName = getFlagString(args.flags, 'agent');
  const includeShared = getFlagBool(args.flags, 'include-shared');
  const allScopes = getFlagBool(args.flags, 'all-scopes');

  // Validate --include-shared requires --agent
  const validation = validateIncludeShared(includeShared, agentName);
  if (!validation.valid) {
    return error(validation.error || '--include-shared requires --agent flag');
  }

  // Validate --all-scopes and --include-shared are mutually exclusive
  if (allScopes && includeShared) {
    return error('--all-scopes and --include-shared are mutually exclusive');
  }

  // Determine base path based on agent context
  const basePath = agentName
    ? resolveAgentScopePath(agentName, scopeStr)
    : getResolvedScopePath(parseScope(scopeStr));

  const threshold = getFlagNumber(args.flags, 'threshold') ?? 0.75;
  const limit = getFlagNumber(args.flags, 'limit') ?? 20;
  const autoLink = getFlagBool(args.flags, 'auto-link');

  return wrapOperation(
    async () => {
      const result = await suggestLinks({
        basePath,
        threshold,
        limit,
        autoLink,
        includeShared,
        allScopes,
        agentName,
        scopeStr,
      });
      return result;
    },
    autoLink ? 'Suggest and create links' : 'Suggest links'
  );
}

/**
 * summarize - Generate summary rollups
 *
 * Usage: memory summarize [type] [--scope <scope>]
 *
 * Note: Implementation pending in Phase 6.
 */
export async function cmdSummarize(args: ParsedArgs): Promise<CliResponse> {
  const typeArg = args.positional[0];
  const scope = parseScope(getFlagString(args.flags, 'scope'));

  void getResolvedScopePath(scope); // Suppress unused warning

  // TODO: Implement summarize in Phase 6 (requires LLM integration)
  return success(
    {
      type: typeArg ?? 'all',
      message: 'Summarize not yet implemented (requires LLM integration)',
    },
    'Summarize (stub)'
  );
}
