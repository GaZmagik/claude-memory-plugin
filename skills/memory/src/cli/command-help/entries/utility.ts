import type { CommandHelpEntry } from '../types.js';

export const UTILITY_HELP: Record<string, CommandHelpEntry> = {
  // Utility Operations
  rename: {
    usage: 'memory rename <old-id> <new-id>',
    description: 'Rename a memory ID, updating all references',
    arguments: `  <old-id>    Current memory ID
  <new-id>    New memory ID`,
    examples: [
      'memory rename temp-note decision-final-choice',
    ],
    notes: `  Updates the file, graph, index, and all edges pointing to/from this memory.`,
  },

  move: {
    usage: 'memory move <id> <scope>',
    description: 'Move a memory to a different scope',
    arguments: `  <id>       Memory ID to move
  <scope>    Target scope (user, project, local, enterprise)`,
    examples: [
      'memory move learning-general user',
      'memory move decision-project-specific project',
    ],
  },

  promote: {
    usage: 'memory promote <id> <type>',
    description: 'Convert a memory to a different type',
    arguments: `  <id>      Memory ID to promote
  <type>    Target type (decision, learning, gotcha, artifact)`,
    examples: [
      'memory promote learning-important-pattern decision',
      'memory promote temporary-finding gotcha',
    ],
    notes: `  Common promotions: temporary→learning, learning→decision, learning→gotcha`,
  },

  demote: {
    usage: 'memory demote <id> <type>',
    description: 'Convert a memory to a different type (alias for promote)',
    arguments: `  <id>      Memory ID to demote
  <type>    Target type`,
    examples: [
      'memory demote decision-premature learning',
    ],
  },

  archive: {
    usage: 'memory archive <id>',
    description: 'Archive a memory (mark as inactive)',
    arguments: `  <id>    Memory ID to archive`,
    examples: [
      'memory archive decision-superseded',
    ],
  },

  status: {
    usage: 'memory status',
    description: 'Show memory system status summary',
    examples: [
      'memory status',
    ],
    notes: `  Shows counts by type, scope, recent activity, and health indicators.`,
  },
};
