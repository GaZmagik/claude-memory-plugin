/**
 * CLI Command Dispatcher
 *
 * Main entry point for the memory CLI.
 * Routes commands to appropriate handlers.
 */

import { parseArgs, type ParsedArgs } from './parser.js';
import { type CliResponse, error, outputResponse } from './response.js';
import { getHelpText } from './help.js';
import { getCommandHelp } from './command-help.js';

// Command handlers - will be populated as we implement them
import { cmdWrite, cmdRead, cmdList, cmdDelete, cmdSearch, cmdSemantic } from './commands/crud.js';
import { cmdTag, cmdUntag } from './commands/tags.js';
import { cmdLink, cmdUnlink, cmdGraph, cmdMermaid, cmdEdges, cmdRemoveNode } from './commands/graph.js';
import { cmdHealth, cmdValidate, cmdQuality, cmdAudit, cmdAuditQuick } from './commands/quality.js';
import { cmdSync, cmdRepair, cmdRebuild, cmdReindex, cmdPrune, cmdSyncFrontmatter, cmdRefresh } from './commands/maintenance.js';
import { cmdRename, cmdMove, cmdPromote, cmdArchive, cmdStatus } from './commands/utility.js';
import {
  cmdBulkLink,
  cmdBulkDelete,
  cmdBulkMove,
  cmdBulkTag,
  cmdBulkUnlink,
  cmdBulkPromote,
  cmdExport,
  cmdImport,
} from './commands/bulk.js';
import { cmdSuggestLinks, cmdSummarize } from './commands/suggest.js';
import { cmdQuery, cmdStats, cmdImpact } from './commands/query.js';
import { cmdThink } from './commands/think.js';

/**
 * Command handler function signature
 */
export type CommandHandler = (args: ParsedArgs) => Promise<CliResponse>;

/**
 * Command registry - maps command names to handlers
 */
const COMMANDS: Record<string, CommandHandler> = {
  // CRUD operations
  write: cmdWrite,
  read: cmdRead,
  list: cmdList,
  delete: cmdDelete,
  search: cmdSearch,
  semantic: cmdSemantic,

  // Tag operations
  tag: cmdTag,
  untag: cmdUntag,

  // Graph operations
  link: cmdLink,
  unlink: cmdUnlink,
  graph: cmdGraph,
  mermaid: cmdMermaid,
  edges: cmdEdges,
  'remove-node': cmdRemoveNode,

  // Quality operations
  health: cmdHealth,
  validate: cmdValidate,
  quality: cmdQuality,
  audit: cmdAudit,
  'audit-quick': cmdAuditQuick,

  // Maintenance operations
  sync: cmdSync,
  repair: cmdRepair,
  rebuild: cmdRebuild,
  reindex: cmdReindex,
  prune: cmdPrune,
  'sync-frontmatter': cmdSyncFrontmatter,
  refresh: cmdRefresh,

  // Utility operations
  rename: cmdRename,
  move: cmdMove,
  promote: cmdPromote,
  demote: cmdPromote, // Alias
  archive: cmdArchive,
  status: cmdStatus,

  // Bulk operations
  'bulk-link': cmdBulkLink,
  'bulk-delete': cmdBulkDelete,
  'bulk-move': cmdBulkMove,
  'bulk-tag': cmdBulkTag,
  'bulk-unlink': cmdBulkUnlink,
  'bulk-promote': cmdBulkPromote,
  export: cmdExport,
  import: cmdImport,

  // Suggestion operations
  'suggest-links': cmdSuggestLinks,
  summarize: cmdSummarize,

  // Query operations
  query: cmdQuery,
  stats: cmdStats,
  impact: cmdImpact,

  // Think operations (two-level command)
  think: cmdThink,

  // Help
  help: cmdHelp,
};

/**
 * Help command handler
 *
 * Supports:
 * - `memory help` - Show compact help
 * - `memory help --full` - Show full help
 * - `memory help <command>` - Show command-specific help
 */
async function cmdHelp(args: ParsedArgs): Promise<CliResponse> {
  const full = args.flags.full === true || args.flags.f === true;

  // Check if a specific command was requested
  const targetCommand = args.positional[0];

  if (targetCommand) {
    const commandHelp = getCommandHelp(targetCommand);
    if (commandHelp) {
      console.log(commandHelp);
    } else {
      console.log(`Unknown command: ${targetCommand}`);
      console.log('');
      console.log(getHelpText(false));
    }
  } else {
    console.log(getHelpText(full));
  }

  // Return empty success (text already output)
  return { status: 'success' };
}

/**
 * Dispatch a command based on arguments
 *
 * @param argv - Raw argument array (typically process.argv.slice(2))
 * @returns Exit code (0 for success, 1 for error)
 */
export async function dispatch(argv: string[]): Promise<number> {
  // Extract command name (first positional arg)
  const commandName = argv[0] ?? 'help';
  const restArgs = argv.slice(1);

  // Parse remaining arguments
  const parsedArgs = parseArgs(restArgs);

  // Check for help flag on any command
  if (parsedArgs.flags.help === true || parsedArgs.flags.h === true) {
    // Show command-specific help if available, otherwise general help
    const commandHelp = getCommandHelp(commandName);
    if (commandHelp) {
      console.log(commandHelp);
    } else {
      console.log(getHelpText(false));
    }
    return 0;
  }

  // Find command handler
  const handler = COMMANDS[commandName];

  if (!handler) {
    const response = error(
      `Unknown command: ${commandName}`,
      'Run "memory help" for available commands'
    );
    return outputResponse(response);
  }

  try {
    const response = await handler(parsedArgs);

    // Help command outputs directly, skip JSON output
    if (commandName === 'help') {
      return response.status === 'success' ? 0 : 1;
    }

    return outputResponse(response);
  } catch (err) {
    const response = error(
      err instanceof Error ? err.message : String(err),
      `Command '${commandName}' failed`
    );
    return outputResponse(response);
  }
}

/**
 * Get list of available commands
 */
export function getAvailableCommands(): string[] {
  return Object.keys(COMMANDS).sort();
}
