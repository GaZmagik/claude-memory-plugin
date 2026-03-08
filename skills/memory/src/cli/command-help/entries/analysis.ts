import type { CommandHelpEntry } from '../types.js';

export const ANALYSIS_HELP: Record<string, CommandHelpEntry> = {
  // Suggestion Operations
  'suggest-links': {
    usage: 'memory suggest-links [options]',
    description: 'Find potential relationships using semantic similarity',
    flags: `  --threshold <n>    Minimum similarity (0-1, default: 0.75)
  --limit <n>        Maximum suggestions (default: 20)
  --auto-link        Automatically create suggested links
  --force            Update existing edge metadata (only when metadata differs)
  --llm-type         Use LLM to suggest relation labels (requires --auto-link)
  --scope <scope>    Target scope
  --agent <name>     Suggest links within agent scope
  --include-shared   Include shared scope memories (requires --agent)
  --all-scopes       Suggest links across all scopes`,
    examples: [
      'memory suggest-links',
      'memory suggest-links --threshold 0.85 --auto-link',
      'memory suggest-links --auto-link --llm-type',
      'memory suggest-links --auto-link --force  # Update metadata on existing edges',
      'memory suggest-links --agent curator --include-shared',
    ],
    notes: `  Requires embeddings to be generated (run semantic search first).
  --llm-type requires Ollama running locally (uses chat model for relation labels).
  --force only updates edges when similarity or verifiedRelation differs (smart bypass).
  --include-shared and --all-scopes are mutually exclusive.`,
  },

  summarize: {
    usage: 'memory summarize [type] [options]',
    description: 'Generate LLM-powered summary rollups of memories',
    arguments: `  [type]    Filter by memory type (decision, learning, gotcha, artifact, etc.)`,
    flags: `  --mode <mode>       Output mode: per-type (default), overview, digest
  --scope <scope>     Target scope (default: project)
  --agent <name>      Summarise agent-scoped memories
  --include-shared    Include shared scopes (requires --agent)
  --all-agents        Summarise across all agent namespaces
  --tags <tags>       Comma-separated tag filter (AND logic)
  --limit <n>         Max memories to summarise (1-500, default: 50)
  --timeout <ms>      LLM timeout per call in ms (1000-600000, default: 120000)`,
    examples: [
      'memory summarize',
      'memory summarize decision',
      'memory summarize --mode overview',
      'memory summarize --mode digest my-memory-id',
      'memory summarize --agent typescript-expert --include-shared',
      'memory summarize --all-agents --limit 100',
      'memory summarize gotcha --tags important --limit 10',
    ],
    notes: `  Requires Ollama running locally (uses chat model from memory.local.md).
  Falls back to structured listing when Ollama is unavailable.
  Large corpora are chunked automatically (map-reduce) to fit the context window.
  Content per memory is truncated at 6000 chars to prevent context length errors.`,
  },

  // Query Operations
  query: {
    usage: 'memory query [options]',
    description: 'Complex filtering with multiple criteria',
    flags: `  --type <type>        Filter by memory type
  --tags <tags>        Filter by tags (comma-separated)
  --has-edges          Only memories with edges
  --orphans            Only orphaned memories (no edges)
  --scope <scope>      Target scope
  --limit <n>          Maximum results
  --agent <name>       Query within agent scope
  --include-shared     Query across agent + shared scopes (requires --agent)`,
    examples: [
      'memory query --type decision --has-edges',
      'memory query --tags important,reviewed',
      'memory query --orphans --scope project',
      'memory query --type learning --agent typescript-expert --include-shared',
    ],
    notes: `  Agent-scoped queries with --include-shared search across:
  1. Agent's own memories (agent-project or agent-global)
  2. Shared memories (local → project → global)
  Results are prefixed with scope indicators and include edge counts.`,
  },

  stats: {
    usage: 'memory stats [scope]',
    description: 'Show graph statistics (connectivity, hubs, sinks)',
    arguments: `  [scope]    Target scope (default: project)`,
    flags: `  --agent <name>       Show stats for agent scope
  --include-shared     Aggregate stats across agent + shared scopes (requires --agent)`,
    examples: [
      'memory stats',
      'memory stats user',
      'memory stats --agent typescript-expert --include-shared',
    ],
    notes: `  Shows edge ratio, hub nodes (many outbound), sink nodes (many inbound),
  orphan count, and overall connectivity health.

  Agent-scoped stats with --include-shared aggregate across:
  1. Agent's own memories (agent-project or agent-global)
  2. Shared memories (local → project → global)
  Results include per-scope breakdown and combined totals.`,
  },

  impact: {
    usage: 'memory impact <id>',
    description: 'Show dependency tree for a memory',
    arguments: `  <id>    Memory ID to analyse`,
    flags: `  --depth <n>        Maximum depth to traverse (default: 3)
  --json             Output as JSON instead of tree
  --agent <name>     Analyse impact within agent scope
  --include-shared   Include shared scope context (requires --agent)`,
    examples: [
      'memory impact decision-core-architecture',
      'memory impact learning-patterns --depth 5',
      'memory impact learning-api-design --agent typescript-expert --include-shared',
    ],
    notes: `  Shows what depends on this memory (inbound) and what it depends on (outbound).

  Agent-scoped impact analysis with --include-shared:
  - Analyses dependencies within the agent's own scope
  - Can reference shared memories for context
  - Does not traverse cross-scope edges (design constraint)`,
  },
};
