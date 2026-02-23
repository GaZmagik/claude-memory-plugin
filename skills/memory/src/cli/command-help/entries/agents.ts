import type { CommandHelpEntry } from '../types.js';

export const AGENTS_HELP: Record<string, CommandHelpEntry> = {
  // Agent Discovery Operations (Phase E)
  agents: {
    usage: 'memory agents <subcommand> [options]',
    description: 'Discover, analyse, and manage agent-scoped memories',
    subcommands: `  list             List all available agents
  stats <name>     Show detailed statistics for an agent
  create <name>    Create a new agent directory structure
  delete <name>    Delete an agent and all its memories
  copy <src> <tgt> Copy an agent to a new name
  rename <old> <new> Rename an agent`,
    flags: `  For 'list':
    --scope <scope>      Filter by scope (project, global)
    --include-stats      Include detailed statistics (types, tags, health)

  For 'stats':
    --all                Show statistics for all agents

  For 'create':
    --scope <scope>      Create in scope (project, global) [default: project]
    --dry-run            Preview changes without creating

  For 'delete':
    --scope <scope>      Delete from scope (project, global) [default: project]
    --force              Skip confirmation prompt (required for non-interactive)
    --dry-run            Preview what would be deleted

  For 'copy':
    --scope <scope>      Operate in scope (project, global) [default: project]
    --force              Merge into existing agent (replace strategy)
    --dry-run            Preview what would be copied

  For 'rename':
    --scope <scope>      Operate in scope (project, global) [default: project]
    --dry-run            Preview what would be renamed`,
    examples: [
      '# Discovery commands',
      'memory agents list',
      'memory agents list --scope project',
      'memory agents list --include-stats',
      'memory agents stats typescript-expert',
      'memory agents stats --all',
      '',
      '# Management commands',
      'memory agents create rust-expert',
      'memory agents create python-pro --scope global',
      'memory agents delete old-agent --force',
      'memory agents delete temp-agent --dry-run',
      'memory agents copy typescript-expert typescript-pro',
      'memory agents copy python-expert python-ml --force',
      'memory agents rename go-expert golang-expert',
      'memory agents rename old-name new-name --dry-run',
    ],
    notes: `  DISCOVERY:
  Agent discovery scans .claude/memory/agents/ (project) and
  ~/.claude/memory/agents/ (global) directories.

  Priority: Project-scoped agents take precedence over global agents
  when duplicate names exist.

  Cross-agent search: Use --all-agents flag with search, list, or query
  commands to search across all discovered agents:
    memory search "API patterns" --all-agents
    memory list --type learning --all-agents
    memory query --tag typescript --all-agents

  MANAGEMENT:
  - create: Initialises agent directory with index.json and graph.json
  - delete: DESTRUCTIVE - requires --force flag or interactive confirmation
  - copy: Duplicates entire agent memory collection (uses export/import)
  - rename: Renames directory and updates all memory frontmatter

  SAFETY:
  - All management commands support --dry-run to preview changes
  - Delete operations require explicit confirmation (--force or interactive prompt)
  - Default scope is 'project' for all operations
  - Copy with --force merges into existing agent (replace strategy)

  NON-INTERACTIVE ENVIRONMENTS:
  In CI/CD or piped contexts where TTY is unavailable, delete commands
  MUST use --force flag. Without it, the command will fail with an error.`,
  },
};
