/**
 * CLI Commands: Bulk Operations
 *
 * Handlers for bulk-link, bulk-delete, export, import commands.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { ParsedArgs } from '../parser.js';
import { readStdinJson, getFlagString, getFlagBool } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { Scope } from '../../types/enums.js';
import { bulkLink, bulkDelete } from '../../bulk/index.js';
import { exportMemories } from '../../core/export.js';
import { importMemories } from '../../core/import.js';
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
 * bulk-link - Create multiple links to a target
 *
 * Usage: memory bulk-link <target> [--pattern <glob>] [--ids <id1,id2>] [--scope <scope>] [--dry-run]
 * Or from stdin: echo '["id1", "id2"]' | memory bulk-link <target>
 */
export async function cmdBulkLink(args: ParsedArgs): Promise<CliResponse> {
  const target = args.positional[0];

  if (!target) {
    return error('Missing required argument: target');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const dryRun = getFlagBool(args.flags, 'dry-run');
  const pattern = getFlagString(args.flags, 'pattern');
  const idsStr = getFlagString(args.flags, 'ids');
  const relation = getFlagString(args.flags, 'relation');

  // Get source IDs from --ids flag or stdin
  let sourceIds: string[] | undefined;

  if (idsStr) {
    sourceIds = idsStr.split(',').map(id => id.trim());
  } else if (!pattern) {
    // Try to read from stdin
    const stdinIds = await readStdinJson<string[]>();
    if (stdinIds && Array.isArray(stdinIds)) {
      sourceIds = stdinIds;
    }
  }

  if (!pattern && (!sourceIds || sourceIds.length === 0)) {
    return error('Must specify --pattern, --ids, or pipe IDs via stdin');
  }

  return wrapOperation(
    async () => {
      const result = await bulkLink({
        target,
        sourcePattern: pattern,
        sourceIds,
        relation,
        basePath,
        dryRun,
      });
      return result;
    },
    `Bulk link to ${target}`
  );
}

/**
 * bulk-delete - Delete multiple memories matching criteria
 *
 * Usage: memory bulk-delete [--pattern <glob>] [--tags <tag1,tag2>] [--scope <scope>] [--dry-run]
 */
export async function cmdBulkDelete(args: ParsedArgs): Promise<CliResponse> {
  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const pattern = getFlagString(args.flags, 'pattern');
  const tagsStr = getFlagString(args.flags, 'tags');
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()) : undefined;
  const dryRun = getFlagBool(args.flags, 'dry-run');

  if (!pattern && !tags) {
    return error('Must specify --pattern or --tags for bulk delete');
  }

  return wrapOperation(
    async () => {
      const result = await bulkDelete({
        basePath,
        pattern,
        tags,
        dryRun,
      });
      return result;
    },
    'Bulk delete'
  );
}

/**
 * export - Export memories to JSON
 *
 * Usage: memory export [scope] [--output <file>]
 */
export async function cmdExport(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const outputFile = getFlagString(args.flags, 'output');

  return wrapOperation(
    async () => {
      const result = await exportMemories({
        basePath,
        includeGraph: true,
      });

      // If output file specified, write to disk
      if (outputFile && result.serialised) {
        fs.writeFileSync(outputFile, result.serialised, 'utf8');
        return {
          ...result,
          writtenTo: outputFile,
        };
      }

      return result;
    },
    `Exported ${scopeArg ?? 'project'} scope`
  );
}

/**
 * import - Import memories from JSON file
 *
 * Usage: memory import <file> [--merge | --replace] [--scope <scope>]
 */
export async function cmdImport(args: ParsedArgs): Promise<CliResponse> {
  const file = args.positional[0];

  if (!file) {
    return error('Missing required argument: file');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const strategy = getFlagBool(args.flags, 'replace') ? 'replace' : 'merge';
  const dryRun = getFlagBool(args.flags, 'dry-run');

  // Read file content
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    return error(`Failed to read file ${file}: ${err}`);
  }

  return wrapOperation(
    async () => {
      const result = await importMemories({
        raw,
        basePath,
        strategy: strategy as 'merge' | 'replace',
        targetScope: scope,
        dryRun,
      });
      return result;
    },
    `Imported from ${file}`
  );
}
