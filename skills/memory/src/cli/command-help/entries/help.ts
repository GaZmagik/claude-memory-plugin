import type { CommandHelpEntry } from '../types.js';

export const HELP_HELP: Record<string, CommandHelpEntry> = {
  // Help
  help: {
    usage: 'memory help [command]',
    description: 'Show help for the memory CLI or a specific command',
    arguments: `  [command]    Command to get help for`,
    flags: `  --full, -f    Show full documentation for all commands`,
    examples: [
      'memory help',
      'memory help write',
      'memory help think',
      'memory help --full',
    ],
  },
};
