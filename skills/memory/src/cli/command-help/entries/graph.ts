import type { CommandHelpEntry } from '../types.js';

export const GRAPH_HELP: Record<string, CommandHelpEntry> = {
  // Graph Operations
  link: {
    usage: 'memory link <source> <target> [relation]',
    description: 'Create a directed edge between two memories',
    arguments: `  <source>     Source memory ID
  <target>     Target memory ID
  [relation]   Relationship type (default: "relates-to")`,
    flags: `  --agent <name>         Source agent scope (for agent-scoped memories)
  --target-agent <name>  Target agent scope (for cross-scope linking)
  --scope <scope>        Source scope (project, global, agent-project, agent-global)
  --target-scope <scope> Target scope (for cross-scope linking)`,
    examples: [
      'memory link decision-api artifact-api-spec',
      'memory link learning-vitest gotcha-mocking "explains"',
      'memory link decision-postgres learning-sql-optimisation "informed-by"',
      '# Cross-scope: link agent memory to project memory',
      'memory link --agent typescript-expert agent-learning project-decision --target-scope project',
      '# Cross-agent: link between two different agents',
      'memory link --agent api-architect api-design --target-agent frontend-expert ui-pattern "informs"',
    ],
    notes: `  Common relation types: relates-to, informed-by, implements,
  supersedes, depends-on, contradicts, supports

  Cross-scope linking: Use --target-agent or --target-scope to create
  links between memories in different scopes. The edge is stored in
  both graphs with metadata indicating the cross-scope relationship.`,
  },

  unlink: {
    usage: 'memory unlink <source> <target>',
    description: 'Remove an edge between two memories',
    arguments: `  <source>    Source memory ID
  <target>    Target memory ID`,
    flags: `  --agent <name>         Source agent scope
  --target-agent <name>  Target agent scope (for cross-scope unlinking)`,
    examples: [
      'memory unlink decision-api artifact-old-spec',
      '# Remove cross-scope link',
      'memory unlink --agent typescript-expert agent-mem --target-scope project project-mem',
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

  'update-edge': {
    usage: 'memory update-edge <source> <target> [options]',
    description: 'Update metadata on an existing edge between two memories',
    arguments: `  <source>    Source memory ID
  <target>    Target memory ID`,
    flags: `  --similarity <0-1>     Set cosine similarity score (0.0 to 1.0)
  --relation <label>     Update edge label/relation type
  --verify               Invoke Ollama to suggest better relation label (stored as verifiedRelation)
  --apply                Apply pending verifiedRelation to label field
  --agent <name>         Source agent scope
  --target-agent <name>  Target agent scope (for cross-scope edges)
  --scope <scope>        Source scope`,
    examples: [
      'memory update-edge decision-001 learning-002 --similarity 0.87',
      'memory update-edge gotcha-001 decision-001 --relation "warns-about"',
      'memory update-edge auto-link-123 manual-verify --verify --relation "implements"',
      'memory update-edge staged-edge approved-edge --apply',
      '# Update cross-scope edge',
      'memory update-edge --agent typescript-expert local-mem --target-agent frontend-expert project-mem --similarity 0.92',
    ],
    notes: `  The --similarity flag validates that the value is between 0 and 1.
  Use --verify to invoke Ollama LLM for relation label suggestions (stored
  as verifiedRelation staging field). Gracefully degrades if Ollama unavailable.
  Use --apply to promote verifiedRelation to the primary label field.
  --verify and --apply are mutually exclusive.

  Cross-scope edges: Use --target-agent when updating edges between
  memories in different agent scopes.`,
  },
};
