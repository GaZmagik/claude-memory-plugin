/**
 * CLI Commands: Tag Operations
 *
 * Handlers for tag and untag commands.
 */

import type { ParsedArgs } from '../parser.js';
import { getFlagString } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { tagMemory, untagMemory } from '../../core/tag.js';
import { getResolvedScopePath, parseScope } from '../helpers.js';

/**
 * tag - Add tags to a memory
 *
 * Usage: memory tag <id> <tag1> [tag2] ... [--scope <scope>]
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

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const result = await tagMemory({ id, tags, basePath });
      return result;
    },
    `Added ${tags.length} tag(s) to ${id}`
  );
}

/**
 * untag - Remove tags from a memory
 *
 * Usage: memory untag <id> <tag1> [tag2] ... [--scope <scope>]
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

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const result = await untagMemory({ id, tags, basePath });
      return result;
    },
    `Removed ${tags.length} tag(s) from ${id}`
  );
}
