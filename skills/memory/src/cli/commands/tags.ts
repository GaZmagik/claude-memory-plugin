/**
 * CLI Commands: Tag Operations
 *
 * Handlers for tag and untag commands.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import type { ParsedArgs } from '../parser.js';
import { getFlagString } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { Scope } from '../../types/enums.js';
import { tagMemory, untagMemory } from '../../core/tag.js';
import { getScopePath } from '../../scope/resolver.js';

/**
 * Get global memory path
 */
function getGlobalMemoryPath(): string {
  return path.join(os.homedir(), '.claude', 'memory');
}

/**
 * Get resolved scope path
 */
function getResolvedScopePath(scope: Scope): string {
  const cwd = process.cwd();
  const globalPath = getGlobalMemoryPath();
  return getScopePath(scope, cwd, globalPath);
}

/**
 * Parse scope string to Scope enum
 */
function parseScope(scopeStr: string | undefined): Scope {
  switch (scopeStr?.toLowerCase()) {
    case 'user':
    case 'global':
      return Scope.Global;
    case 'project':
      return Scope.Project;
    case 'local':
      return Scope.Local;
    case 'enterprise':
      return Scope.Enterprise;
    default:
      return Scope.Project;
  }
}

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
