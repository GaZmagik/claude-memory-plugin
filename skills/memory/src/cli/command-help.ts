/**
 * Per-Command Help Text
 *
 * Provides detailed help for individual commands.
 * Used when running `memory <command> --help` or `memory help <command>`.
 */

/**
 * Command help entry with structured information
 */
export interface CommandHelpEntry {
  usage: string;
  description: string;
  arguments?: string;
  flags?: string;
  examples?: string[];
  subcommands?: string;
  notes?: string;
}

/**
 * Format a CommandHelpEntry into displayable text
 */
export function formatCommandHelp(command: string, help: CommandHelpEntry): string {
  const lines: string[] = [];

  lines.push(`memory ${command} - ${help.description}`);
  lines.push('');
  lines.push('USAGE:');
  lines.push(`  ${help.usage}`);

  if (help.arguments) {
    lines.push('');
    lines.push('ARGUMENTS:');
    lines.push(help.arguments);
  }

  if (help.flags) {
    lines.push('');
    lines.push('FLAGS:');
    lines.push(help.flags);
  }

  if (help.subcommands) {
    lines.push('');
    lines.push('SUBCOMMANDS:');
    lines.push(help.subcommands);
  }

  if (help.examples && help.examples.length > 0) {
    lines.push('');
    lines.push('EXAMPLES:');
    for (const example of help.examples) {
      lines.push(`  ${example}`);
    }
  }

  if (help.notes) {
    lines.push('');
    lines.push('NOTES:');
    lines.push(help.notes);
  }

  return lines.join('\n');
}

/**
 * Per-command help registry
 */
export const COMMAND_HELP: Record<string, CommandHelpEntry> = {
  // CRUD Operations
  write: {
    usage: 'memory write [options]',
    description: 'Create or update a memory from JSON stdin',
    flags: `  --auto-link              Auto-link to similar memories after writing
  --auto-link-threshold <n> Similarity threshold for auto-linking (0-1, default: 0.75)
  --scope <scope>          Target scope (user, project, local, enterprise)`,
    examples: [
      'echo \'{"title":"My Decision","type":"decision","content":"We chose X"}\' | memory write',
      'cat memory.json | memory write --auto-link --auto-link-threshold 0.8',
      'echo \'{"title":"Local Note","type":"learning","content":"..."}\' | memory write --scope local',
    ],
    notes: `  Required JSON fields: title, content, type
  Optional JSON fields: id (auto-generated if omitted), tags, links, scope
  Memory types: decision, learning, gotcha, artifact, breadcrumb, hub`,
  },

  read: {
    usage: 'memory read <id>',
    description: 'Read a memory by its ID',
    arguments: `  <id>    The memory ID to read (e.g., "decision-use-postgres")`,
    flags: `  --scope <scope>    Search scope (user, project, local, enterprise)`,
    examples: [
      'memory read decision-use-postgres',
      'memory read learning-vitest-mocking --scope user',
    ],
  },

  list: {
    usage: 'memory list [type] [tag]',
    description: 'List all memories, optionally filtered by type or tag',
    arguments: `  [type]   Filter by memory type (decision, learning, gotcha, artifact, etc.)
  [tag]    Filter by tag`,
    flags: `  --scope <scope>    Target scope (user, project, local, enterprise)
  --limit <n>        Maximum number of results`,
    examples: [
      'memory list',
      'memory list decision',
      'memory list learning typescript',
      'memory list --scope user --limit 20',
    ],
  },

  delete: {
    usage: 'memory delete <id>',
    description: 'Delete a memory and remove from graph/index',
    arguments: `  <id>    The memory ID to delete`,
    flags: `  --force    Skip confirmation prompt`,
    examples: [
      'memory delete temporary-old-note',
      'memory delete decision-outdated --force',
    ],
    notes: `  This permanently removes the memory file, graph node, and index entry.
  Use with caution - deletion cannot be undone.`,
  },

  search: {
    usage: 'memory search <query>',
    description: 'Full-text search across titles and content',
    arguments: `  <query>    Search terms (case-insensitive)`,
    flags: `  --scope <scope>    Target scope
  --type <type>      Filter by memory type
  --limit <n>        Maximum results (default: 20)`,
    examples: [
      'memory search "database migration"',
      'memory search typescript --type learning',
      'memory search vitest --scope project --limit 10',
    ],
  },

  semantic: {
    usage: 'memory semantic <query>',
    description: 'Search by meaning using embeddings (requires Ollama)',
    arguments: `  <query>    Natural language query`,
    flags: `  --threshold <n>    Minimum similarity (0-1, default: 0.7)
  --limit <n>        Maximum results (default: 10)
  --scope <scope>    Target scope`,
    examples: [
      'memory semantic "how do we handle authentication"',
      'memory semantic "testing patterns" --threshold 0.8',
    ],
    notes: `  Requires Ollama running locally with an embedding model.
  First search may be slow as embeddings are generated.`,
  },

  // Tag Operations
  tag: {
    usage: 'memory tag <id> <tags...>',
    description: 'Add one or more tags to a memory',
    arguments: `  <id>       The memory ID to tag
  <tags...>  One or more tags to add`,
    examples: [
      'memory tag decision-api-design important reviewed',
      'memory tag learning-typescript typescript beginner',
    ],
  },

  untag: {
    usage: 'memory untag <id> <tags...>',
    description: 'Remove one or more tags from a memory',
    arguments: `  <id>       The memory ID to untag
  <tags...>  One or more tags to remove`,
    examples: [
      'memory untag decision-api-design draft',
      'memory untag learning-old deprecated legacy',
    ],
  },

  // Graph Operations
  link: {
    usage: 'memory link <source> <target> [relation]',
    description: 'Create a directed edge between two memories',
    arguments: `  <source>     Source memory ID
  <target>     Target memory ID
  [relation]   Relationship type (default: "relates-to")`,
    examples: [
      'memory link decision-api artifact-api-spec',
      'memory link learning-vitest gotcha-mocking "explains"',
      'memory link decision-postgres learning-sql-optimisation "informed-by"',
    ],
    notes: `  Common relation types: relates-to, informed-by, implements,
  supersedes, depends-on, contradicts, supports`,
  },

  unlink: {
    usage: 'memory unlink <source> <target>',
    description: 'Remove an edge between two memories',
    arguments: `  <source>    Source memory ID
  <target>    Target memory ID`,
    examples: [
      'memory unlink decision-api artifact-old-spec',
    ],
  },

  graph: {
    usage: 'memory graph [scope]',
    description: 'Export the full memory graph as JSON',
    arguments: `  [scope]    Target scope (default: project)`,
    examples: [
      'memory graph',
      'memory graph user > user-graph.json',
    ],
  },

  mermaid: {
    usage: 'memory mermaid [options]',
    description: 'Generate a Mermaid diagram of the memory graph',
    flags: `  --direction <dir>     Graph direction: TB (top-bottom) or LR (left-right)
  --include-orphans     Include nodes with no edges
  --scope <scope>       Target scope`,
    examples: [
      'memory mermaid',
      'memory mermaid --direction LR --include-orphans',
      'memory mermaid > graph.mmd',
    ],
  },

  edges: {
    usage: 'memory edges <id>',
    description: 'Show all inbound and outbound edges for a node',
    arguments: `  <id>    The memory ID to inspect`,
    examples: [
      'memory edges decision-architecture',
    ],
  },

  'remove-node': {
    usage: 'memory remove-node <id>',
    description: 'Remove a node from the graph (file remains on disk)',
    arguments: `  <id>    The memory ID to remove from graph`,
    examples: [
      'memory remove-node orphaned-node',
    ],
    notes: `  Use this to clean up graph without deleting the actual memory file.
  The file can be re-indexed later with "memory reindex".`,
  },

  // Quality Operations
  health: {
    usage: 'memory health [scope]',
    description: 'Quick connectivity health check with score',
    arguments: `  [scope]    Target scope (default: project)`,
    examples: [
      'memory health',
      'memory health user',
    ],
  },

  validate: {
    usage: 'memory validate [scope]',
    description: 'Detailed validation with issue detection',
    arguments: `  [scope]    Target scope (default: project)`,
    examples: [
      'memory validate',
      'memory validate --scope user',
    ],
    notes: `  Checks for orphaned nodes, broken links, invalid frontmatter,
  missing required fields, and other consistency issues.`,
  },

  quality: {
    usage: 'memory quality <id>',
    description: 'Assess quality score for a single memory',
    arguments: `  <id>    The memory ID to assess`,
    flags: `  --deep    Include LLM-based checks (slower but more thorough)`,
    examples: [
      'memory quality decision-architecture',
      'memory quality learning-patterns --deep',
    ],
    notes: `  Returns a quality score (0-100) based on:
  - Tier 1: Frontmatter completeness
  - Tier 2: Content structure and linking
  - Tier 3 (--deep): LLM assessment of clarity and usefulness`,
  },

  audit: {
    usage: 'memory audit [scope]',
    description: 'Bulk quality scan across all memories',
    arguments: `  [scope]    Target scope (default: project)`,
    flags: `  --threshold <n>    Minimum quality score to pass (default: 50)
  --deep             Include LLM checks for each memory`,
    examples: [
      'memory audit',
      'memory audit --threshold 70',
      'memory audit user --deep',
    ],
  },

  'audit-quick': {
    usage: 'memory audit-quick [scope]',
    description: 'Fast deterministic-only quality scan',
    arguments: `  [scope]    Target scope (default: project)`,
    examples: [
      'memory audit-quick',
    ],
    notes: `  Faster than full audit - only runs Tier 1 and 2 checks.
  Use for quick feedback during development.`,
  },

  // Maintenance Operations
  sync: {
    usage: 'memory sync [scope]',
    description: 'Synchronise graph, index, and disk files',
    arguments: `  [scope]    Target scope (default: project)`,
    examples: [
      'memory sync',
      'memory sync user',
    ],
    notes: `  Reconciles differences between graph.json, index.json, and
  actual memory files on disk. Safe to run repeatedly.`,
  },

  repair: {
    usage: 'memory repair [scope]',
    description: 'Run sync then validate',
    arguments: `  [scope]    Target scope (default: project)`,
    examples: [
      'memory repair',
    ],
    notes: `  Combines sync and validate in a single operation.
  Good first step when memory system seems inconsistent.`,
  },

  rebuild: {
    usage: 'memory rebuild [scope]',
    description: 'Full reconstruction of graph and index from disk',
    arguments: `  [scope]    Target scope (default: project)`,
    examples: [
      'memory rebuild',
    ],
    notes: `  WARNING: Destructive operation! Completely rebuilds graph.json
  and index.json from memory files. Edge relationships may be lost
  if not stored in file frontmatter. Use as last resort.`,
  },

  reindex: {
    usage: 'memory reindex <id>',
    description: 'Re-index an orphan file into the memory system',
    arguments: `  <id>    The memory ID to reindex`,
    examples: [
      'memory reindex recovered-memory',
    ],
    notes: `  Use after manually creating a memory file or after remove-node.`,
  },

  prune: {
    usage: 'memory prune',
    description: 'Remove expired temporary memories',
    examples: [
      'memory prune',
    ],
    notes: `  Deletes temporary memories past their expiration date.
  Safe to run regularly - only affects expired content.`,
  },

  'sync-frontmatter': {
    usage: 'memory sync-frontmatter',
    description: 'Bulk sync frontmatter fields from graph.json',
    examples: [
      'memory sync-frontmatter',
    ],
    notes: `  Updates memory files with metadata from graph.json.
  Useful after bulk graph modifications.`,
  },

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

  // Suggestion Operations
  'suggest-links': {
    usage: 'memory suggest-links [options]',
    description: 'Find potential relationships using semantic similarity',
    flags: `  --threshold <n>    Minimum similarity (0-1, default: 0.75)
  --limit <n>        Maximum suggestions (default: 20)
  --auto-link        Automatically create suggested links
  --scope <scope>    Target scope`,
    examples: [
      'memory suggest-links',
      'memory suggest-links --threshold 0.85 --auto-link',
    ],
    notes: `  Requires embeddings to be generated (run semantic search first).`,
  },

  summarize: {
    usage: 'memory summarize [type]',
    description: 'Generate summary rollups of memories',
    arguments: `  [type]    Filter by memory type`,
    examples: [
      'memory summarize',
      'memory summarize decision',
    ],
  },

  // Query Operations
  query: {
    usage: 'memory query [options]',
    description: 'Complex filtering with multiple criteria',
    flags: `  --type <type>      Filter by memory type
  --tags <tags>      Filter by tags (comma-separated)
  --has-edges        Only memories with edges
  --orphans          Only orphaned memories (no edges)
  --scope <scope>    Target scope
  --limit <n>        Maximum results`,
    examples: [
      'memory query --type decision --has-edges',
      'memory query --tags important,reviewed',
      'memory query --orphans --scope project',
    ],
  },

  stats: {
    usage: 'memory stats [scope]',
    description: 'Show graph statistics (connectivity, hubs, sinks)',
    arguments: `  [scope]    Target scope (default: project)`,
    examples: [
      'memory stats',
      'memory stats user',
    ],
    notes: `  Shows edge ratio, hub nodes (many outbound), sink nodes (many inbound),
  orphan count, and overall connectivity health.`,
  },

  impact: {
    usage: 'memory impact <id>',
    description: 'Show dependency tree for a memory',
    arguments: `  <id>    Memory ID to analyse`,
    flags: `  --depth <n>    Maximum depth to traverse (default: 3)
  --json         Output as JSON instead of tree`,
    examples: [
      'memory impact decision-core-architecture',
      'memory impact learning-patterns --depth 5',
    ],
    notes: `  Shows what depends on this memory (inbound) and what it depends on (outbound).`,
  },

  // Think Operations
  think: {
    usage: 'memory think <subcommand> [options]',
    description: 'Ephemeral thinking documents for deliberation',
    subcommands: `  create <topic>      Create new thinking document
  add <thought>       Add thought to current document
  counter <thought>   Add counter-argument
  branch <thought>    Add alternative branch
  list                List all thinking documents
  show [id]           Show document contents
  use <id>            Switch current document
  conclude <text>     Conclude and optionally promote
  delete <id>         Delete thinking document`,
    flags: `  For 'add', 'counter', 'branch':
    --by <author>      Attribute thought to author
    --call <agent>     Invoke external agent for thought
    --style <style>    Agent style (e.g., "devil's advocate")

  For 'conclude':
    --promote <type>   Promote to permanent memory type`,
    examples: [
      'memory think create "Should we use Redis or PostgreSQL?"',
      'memory think add "Redis is faster for simple lookups"',
      'memory think counter "But PostgreSQL reduces infrastructure complexity"',
      'memory think conclude "Use PostgreSQL" --promote decision',
      'memory think list',
      'memory think show',
      'memory think delete thought-20240115-123456',
    ],
    notes: `  Thinking documents are ephemeral - they live in temporary/ and are
  meant to be concluded and optionally promoted to permanent memories.
  Use for structured deliberation before making decisions.`,
  },

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
  return formatCommandHelp(command, help);
}

/**
 * Check if a command has help available
 */
export function hasCommandHelp(command: string): boolean {
  return command in COMMAND_HELP;
}
