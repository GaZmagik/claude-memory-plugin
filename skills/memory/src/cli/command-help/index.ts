/**
 * Per-Command Help Text
 *
 * Provides detailed help for individual commands.
 * Used when running `memory <command> --help` or `memory help <command>`.
 */

import { discoverAgents, discoverStyles } from '../../think/discovery.js';
import { CRUD_HELP } from './entries/crud.js';
import { GRAPH_HELP } from './entries/graph.js';
import { QUALITY_HELP } from './entries/quality.js';
import { MAINTENANCE_HELP } from './entries/maintenance.js';
import { UTILITY_HELP } from './entries/utility.js';
import { BULK_HELP } from './entries/bulk.js';
import { ANALYSIS_HELP } from './entries/analysis.js';
import { AGENTS_HELP } from './entries/agents.js';
import { THINK_HELP } from './entries/think.js';
import { HELP_HELP } from './entries/help.js';
import { formatCommandHelp, formatDiscoveredList } from './formatter.js';
import type { CommandHelpEntry } from './types.js';

export type { CommandHelpEntry } from './types.js';
export { formatCommandHelp } from './formatter.js';

/**
 * Per-command help registry
 */
export const COMMAND_HELP: Record<string, CommandHelpEntry> = {
  ...CRUD_HELP,
  ...GRAPH_HELP,
  ...QUALITY_HELP,
  ...MAINTENANCE_HELP,
  ...UTILITY_HELP,
  ...BULK_HELP,
  ...ANALYSIS_HELP,
  ...AGENTS_HELP,
  ...THINK_HELP,
  ...HELP_HELP,
};

/**
 * Get help text for a specific command
 *
 * @param command - Command name
 * @returns Formatted help text, or undefined if command not found
 */
export function getCommandHelp(command: string): string | undefined {
  const help = COMMAND_HELP[command];
  if (!help) {
    return undefined;
  }

  let output = formatCommandHelp(command, help);

  // Add dynamic agent/style discovery for think command
  if (command === 'think') {
    const agents = discoverAgents();
    const styles = discoverStyles();

    output += '\n\nAVAILABLE AGENTS:\n';
    output += formatDiscoveredList(agents);

    output += '\n\nAVAILABLE OUTPUT STYLES:\n';
    output += formatDiscoveredList(styles);
  }

  return output;
}

/**
 * Check if a command has help available
 */
export function hasCommandHelp(command: string): boolean {
  return command in COMMAND_HELP;
}
