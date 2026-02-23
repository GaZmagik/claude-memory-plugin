import type { CommandHelpEntry } from '../types.js';

export const MAINTENANCE_HELP: Record<string, CommandHelpEntry> = {
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

  setup: {
    usage: 'memory setup [--force]',
    description: 'Create local settings file from example template',
    flags: `  --force    Overwrite existing settings file`,
    examples: [
      'memory setup',
      'memory setup --force',
    ],
    notes: `  Creates .claude/memory.local.md from .claude/memory.example.md.
  Configure Ollama models and other settings in the local file.
  The local file is gitignored for per-user customisation.`,
  },

  refresh: {
    usage: 'memory refresh [scope]',
    description: 'Backfill missing frontmatter fields and edge similarity scores',
    arguments: `  [scope]    Scope to refresh (project, local, user). Default: project`,
    flags: `  --score-edges    Compute cosine similarity for all edges with available embeddings
  --verify         (requires --score-edges) LLM-suggest relation label → verifiedRelation staging
  --apply          (requires --score-edges) Promote verifiedRelation → label on scored edges
  --force          (requires --score-edges) Re-score edges that already have similarity
  --dry-run        Preview what would change, no writes`,
    examples: [
      'memory refresh',
      'memory refresh project',
      'memory refresh --score-edges --dry-run',
      'memory refresh --score-edges',
      'memory refresh --score-edges --verify',
      'memory refresh --score-edges --force --apply',
    ],
    notes: `  Adds missing frontmatter fields to memory files.
  Safe to run - only adds fields, never removes.

  --score-edges backfills cosine similarity onto edges created by 'memory link'
  or 'bulk-link' that have no similarity score. Requires embeddings to be
  generated first (memory refresh --embeddings).

  --verify calls Ollama to suggest a relation label and stores it in the
  verifiedRelation staging field. --apply promotes staged labels to edge.label.
  Use --force to re-score edges that already have a similarity value.`,
  },
};
