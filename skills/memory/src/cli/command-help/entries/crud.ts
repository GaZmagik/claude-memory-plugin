import type { CommandHelpEntry } from '../types.js';

export const CRUD_HELP: Record<string, CommandHelpEntry> = {
  // CRUD Operations
  write: {
    usage: 'memory write [options]',
    description: 'Create or update a memory from JSON stdin',
    flags: `  --auto-link              Auto-link to similar memories after writing
  --auto-link-threshold <n> Similarity threshold for auto-linking (0-1, default: 0.75)
  --scope <scope>          Target scope (user, project, local, enterprise)
  --agent <name>           Write to agent-scoped memory`,
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
    flags: `  --scope <scope>    Search scope (user, project, local, enterprise)
  --agent <name>     Read from agent-scoped memory`,
    examples: [
      'memory read decision-use-postgres',
      'memory read learning-vitest-mocking --scope user',
      'memory read reminder-curator-patterns --agent curator',
    ],
  },

  list: {
    usage: 'memory list [type] [tag]',
    description: 'List all memories, optionally filtered by type or tag',
    arguments: `  [type]   Filter by memory type (decision, learning, gotcha, artifact, etc.)
  [tag]    Filter by tag`,
    flags: `  --scope <scope>      Target scope (user, project, local, enterprise)
  --limit <n>          Maximum number of results
  --agent <name>       List memories within agent scope
  --include-shared     List across agent + shared scopes (requires --agent)`,
    examples: [
      'memory list',
      'memory list decision',
      'memory list learning typescript',
      'memory list --scope user --limit 20',
      'memory list learning --agent typescript-expert --include-shared',
    ],
    notes: `  Agent-scoped listing with --include-shared searches across:
  1. Agent's own memories (agent-project or agent-global)
  2. Shared memories (local → project → global)
  Results are prefixed with scope indicators like [agent-project], [project], [global].`,
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
    flags: `  --scope <scope>      Target scope
  --type <type>        Filter by memory type
  --limit <n>          Maximum results (default: 20)
  --agent <name>       Search within agent scope
  --include-shared     Search across agent + shared scopes (requires --agent)`,
    examples: [
      'memory search "database migration"',
      'memory search typescript --type learning',
      'memory search vitest --scope project --limit 10',
      'memory search "patterns" --agent typescript-expert --include-shared',
    ],
    notes: `  Agent-scoped search with --include-shared searches across:
  1. Agent's own memories (agent-project or agent-global)
  2. Shared memories (local → project → global)
  Results are prefixed with scope indicators like [agent-project], [project], [global].`,
  },

  semantic: {
    usage: 'memory semantic <query>',
    description: 'Search by meaning using embeddings (requires Ollama)',
    arguments: `  <query>    Natural language query`,
    flags: `  --threshold <n>      Minimum similarity (0-1, default: 0.7)
  --limit <n>          Maximum results (default: 10)
  --scope <scope>      Target scope
  --agent <name>       Search within agent scope
  --include-shared     Search across agent + shared scopes (requires --agent)`,
    examples: [
      'memory semantic "how do we handle authentication"',
      'memory semantic "testing patterns" --threshold 0.8',
      'memory semantic "API design" --agent typescript-expert --include-shared',
    ],
    notes: `  Requires Ollama running locally with an embedding model.
  First search may be slow as embeddings are generated.

  Agent-scoped search with --include-shared searches across:
  1. Agent's own memories (agent-project or agent-global)
  2. Shared memories (local → project → global)
  Results are prefixed with scope indicators and sorted by similarity.`,
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
};
