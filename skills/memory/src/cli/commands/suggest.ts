/**
 * CLI Commands: Suggestion Operations
 *
 * Handlers for suggest-links and summarize commands.
 */

import type { ParsedArgs } from '../parser.js';
import { getFlagString, getFlagNumber, getFlagBool } from '../parser.js';
import type { CliResponse } from '../response.js';
import { success, error, wrapOperation } from '../response.js';
import { suggestLinks } from '../../suggest/suggest-links.js';
import { summarize, DEFAULT_LIMIT, DEFAULT_TIMEOUT_MS } from '../../summarize/summarize.js';
import type { SummarizeMode } from '../../summarize/summarize.js';
import { readContextWindow } from '../../services/ollama.js';
import { getResolvedScopePath, getGlobalMemoryPath, parseScope, parseMemoryType, resolveAgentScopePath, resolveSharedScopePaths, validateIncludeShared } from '../helpers.js';
import { MemoryType } from '../../types/enums.js';
import { discoverAgents } from '../../core/agent-discovery.js';

const VALID_MODES = new Set<string>(['per-type', 'overview', 'digest']);
function isValidMode(s: string): s is SummarizeMode { return VALID_MODES.has(s); }
const MAX_LIMIT = 500;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 600_000;

/**
 * suggest-links - Suggest potential relationships using embeddings
 *
 * Usage: memory suggest-links [--threshold <n>] [--limit <n>] [--auto-link] [--scope <scope>] [--agent <agent>] [--all-scopes]
 *
 * Uses semantic similarity to find memories that might be related.
 * Requires embeddings cache (generated via semantic search).
 */
export async function cmdSuggestLinks(args: ParsedArgs): Promise<CliResponse> {
  const scopeStr = getFlagString(args.flags, 'scope');
  
  // Parse agent and all-scopes flags
  const agentName = getFlagString(args.flags, 'agent');
  const allScopes = getFlagBool(args.flags, 'all-scopes');

  // Determine base path based on agent context
  const basePath = agentName
    ? await resolveAgentScopePath(agentName, scopeStr)
    : await getResolvedScopePath(parseScope(scopeStr));

  const threshold = getFlagNumber(args.flags, 'threshold') ?? 0.75;
  const limit = getFlagNumber(args.flags, 'limit') ?? 20;
  const autoLink = getFlagBool(args.flags, 'auto-link');
  const llmType = getFlagBool(args.flags, 'llm-type');
  const force = getFlagBool(args.flags, 'force');

  return wrapOperation(
    async () => {
      const result = await suggestLinks({
        basePath,
        threshold,
        limit,
        autoLink,
        allScopes,
        agentName,
        scopeStr,
        llmType,
        force,
      });
      return result;
    },
    autoLink ? 'Suggest and create links' : 'Suggest links'
  );
}

/**
 * summarize - Generate LLM-powered summary rollups
 *
 * Usage: memory summarize [type] [--mode <mode>] [--scope <scope>] [--agent <name>]
 *        [--include-shared] [--all-agents] [--tags <tags>] [--limit <n>] [--timeout <ms>]
 */
export async function cmdSummarize(args: ParsedArgs): Promise<CliResponse> {
  const modeStr = getFlagString(args.flags, 'mode') ?? 'per-type';
  if (!isValidMode(modeStr)) {
    return error(`Invalid --mode '${modeStr}'. Must be one of: per-type, overview, digest`);
  }
  const mode = modeStr;

  const scopeStr = getFlagString(args.flags, 'scope');
  const agentName = getFlagString(args.flags, 'agent');
  const allAgents = getFlagBool(args.flags, 'all-agents');
  const includeShared = getFlagBool(args.flags, 'include-shared');
  const tagsStr = getFlagString(args.flags, 'tags');
  const limit = Math.min(Math.max(getFlagNumber(args.flags, 'limit') ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const timeoutMs = Math.min(Math.max(getFlagNumber(args.flags, 'timeout') ?? DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
  const contextWindow = readContextWindow();

  // Validate --include-shared requires --agent
  const validation = validateIncludeShared(includeShared, agentName);
  if (!validation.valid) {
    return error(validation.error!);
  }

  // Digest mode: positional[0] is the memory ID
  // Non-digest mode: positional[0] is the type filter
  let typeFilter: MemoryType | undefined;
  let digestId: string | undefined;

  if (mode === 'digest') {
    digestId = args.positional[0];
    if (!digestId) {
      return error('digest mode requires a memory ID as a positional argument');
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/i.test(digestId)) {
      return error('digestId must contain only alphanumeric characters and hyphens');
    }
  } else {
    const rawType = args.positional[0];
    if (rawType !== undefined) {
      const parsed = parseMemoryType(rawType);
      if (parsed === undefined) {
        return error(`Invalid memory type '${rawType}'. Valid types: decision, learning, artifact, gotcha, breadcrumb, hub, rule, reminder`);
      }
      typeFilter = parsed;
    }
  }

  // Resolve basePaths from scope/agent flags
  const basePaths: string[] = [];
  if (allAgents) {
    if (agentName) {
      process.stderr.write('[summarize] --agent is ignored when --all-agents is set\n');
    }
    const agents = await discoverAgents({
      projectRoot: process.cwd(),
      globalRoot: getGlobalMemoryPath(),
    });
    for (const agent of agents) {
      basePaths.push(await resolveAgentScopePath(agent.name, scopeStr));
    }
  } else if (agentName) {
    if (includeShared) {
      const sharedPaths = await resolveSharedScopePaths(agentName, scopeStr);
      basePaths.push(...sharedPaths);
    } else {
      basePaths.push(await resolveAgentScopePath(agentName, scopeStr));
    }
  } else {
    basePaths.push(await getResolvedScopePath(parseScope(scopeStr)));
  }

  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  try {
    const result = await summarize({
      basePaths,
      mode,
      typeFilter,
      digestId,
      tags,
      limit,
      timeoutMs,
      contextWindow,
    });

    let message = 'Summarize complete';
    if (result.memoriesIncluded.length === 0) {
      message = 'No memories found matching the given filters';
    } else if (result.hint) {
      message = 'Summarize complete (LLM unavailable — structured listing returned)';
    }

    return success(result, message);
  } catch (err) {
    return error(err instanceof Error ? err.message : String(err));
  }
}
