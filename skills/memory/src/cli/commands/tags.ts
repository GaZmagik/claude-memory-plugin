/**
 * CLI Commands: Tag Operations
 *
 * Handlers for tag and untag commands.
 */

import type { ParsedArgs } from '../parser.js';
import { getFlagString, getFlagBool } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { tagMemory, untagMemory } from '../../core/tag.js';
import { getResolvedScopePath, parseScope, resolveAgentScopePath } from '../helpers.js';

/**
 * tag - Add tags to a memory
 *
 * Usage: memory tag <id> <tag1> [tag2] ... [--scope <scope>] [--agent <name>]
 */
export async function cmdTag(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];
  const tags = args.positional.slice(1);

  if (!id) {
    return error('Missing required argument: id');
  }

  if (tags.length === 0) {
    return error('Missing required argument: at least one tag');
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

  return wrapOperation(
    async () => {
      const result = await tagMemory({ id, tags, basePath, agent: agentName });
      return result;
    },
    `Added ${tags.length} tag(s) to ${id}`
  );
}

/**
 * untag - Remove tags from a memory
 *
 * Usage: memory untag <id> <tag1> [tag2] ... [--scope <scope>] [--agent <name>]
 */
export async function cmdUntag(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];
  const tags = args.positional.slice(1);

  if (!id) {
    return error('Missing required argument: id');
  }

  if (tags.length === 0) {
    return error('Missing required argument: at least one tag');
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

  return wrapOperation(
    async () => {
      const result = await untagMemory({ id, tags, basePath, agent: agentName });
      return result;
    },
    `Removed ${tags.length} tag(s) from ${id}`
  );
}
