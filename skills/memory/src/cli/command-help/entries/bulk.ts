import type { CommandHelpEntry } from '../types.js';

export const BULK_HELP: Record<string, CommandHelpEntry> = {
  // Bulk Operations
  'bulk-link': {
    usage: 'memory bulk-link [file]',
    description: 'Create multiple links from JSON input',
    arguments: `  [file]    JSON file path (or stdin if omitted)`,
    examples: [
      'memory bulk-link links.json',
      'echo \'[{"source":"a","target":"b"},{"source":"c","target":"d"}]\' | memory bulk-link',
    ],
    notes: `  JSON format: [{ "source": "id1", "target": "id2", "relation": "..." }, ...]
  The relation field is optional (defaults to "relates-to").`,
  },

  'bulk-delete': {
    usage: 'memory bulk-delete [options]',
    description: 'Delete multiple memories matching criteria',
    flags: `  --pattern <glob>    ID pattern to match (e.g., "temp-*")
  --type <type>       Filter by memory type
  --tag <tag>         Filter by tag
  --scope <scope>     Target scope
  --dry-run           Preview without deleting`,
    examples: [
      'memory bulk-delete --pattern "temp-*" --dry-run',
      'memory bulk-delete --type temporary --scope local',
      'memory bulk-delete --tag deprecated',
    ],
    notes: `  ALWAYS use --dry-run first to preview what will be deleted!`,
  },

  export: {
    usage: 'memory export [scope]',
    description: 'Export memories to a JSON snapshot file',
    arguments: `  [scope]    Target scope (default: project)`,
    flags: `  --output <file>    Output file path (default: stdout)`,
    examples: [
      'memory export > backup.json',
      'memory export user --output user-memories.json',
    ],
  },

  import: {
    usage: 'memory import <file>',
    description: 'Import memories from a JSON snapshot',
    arguments: `  <file>    JSON file to import`,
    flags: `  --merge      Merge with existing (skip duplicates) [default]
  --replace    Replace existing memories with same ID`,
    examples: [
      'memory import backup.json',
      'memory import shared-memories.json --merge',
    ],
  },
};
