# Memory Skill

Persistent knowledge storage for Claude Code sessions.

For the complete plugin documentation, see the [main README](../../README.md).

## Quick Reference

See [SKILL.md](SKILL.md) for:
- Full command reference (36 commands)
- When to invoke the skill
- Quick usage examples

## Installation

The memory CLI is a TypeScript application that runs on Bun. Install via `bun link` from the plugin root:

```bash
cd /path/to/claude-memory-plugin
bun install
bun link
```

This exposes the `memory` command globally. Verify with:

```bash
memory help
memory status
```

## Quick Start

### Store a Decision

```bash
echo '{
  "title": "Use Postgres for Persistence",
  "type": "decision",
  "scope": "project",
  "tags": ["database", "architecture"],
  "content": "# Decision\n\nWe chose Postgres because..."
}' | memory write
```

### Search Memories

```bash
# Full-text search
memory search "database"

# Semantic search (by meaning)
memory semantic "How should we handle data persistence?"

# List by type
memory list decision
memory list gotcha --tag typescript
```

### Check System Health

```bash
memory health project
memory validate project
memory stats project
```

### Graph Operations

```bash
# Link related memories
memory link decision-postgres learning-orm-issues "informed-by"

# View relationships
memory edges decision-postgres

# Generate diagram
memory mermaid project
```

### Thinking Sessions

```bash
# Start deliberation
memory think create "Should we refactor the CLI?"

# Add thoughts
memory think add "Current implementation is 800 lines"
memory think counter "But extraction increases complexity"
memory think branch "Alternative: reorganise sections only"

# Conclude and optionally save
memory think conclude "Extract validation module only" --promote decision
```

## Architecture

The memory skill is implemented in TypeScript and runs on Bun.

```
skills/memory/
├── src/
│   ├── cli.ts                 # Entry point (#!/usr/bin/env bun)
│   ├── index.ts               # Public API exports
│   ├── cli/                   # CLI layer
│   │   ├── index.ts           # Command dispatcher (36 commands)
│   │   ├── parser.ts          # Argument parsing
│   │   ├── response.ts        # JSON response formatting
│   │   ├── help.ts            # Help text generation
│   │   ├── command-help.ts    # Per-command help
│   │   └── commands/          # Command handlers by category
│   │       ├── crud.ts        # write, read, list, delete, search, semantic
│   │       ├── tags.ts        # tag, untag
│   │       ├── graph.ts       # link, unlink, graph, mermaid, edges, remove-node
│   │       ├── quality.ts     # health, validate, quality, audit, audit-quick
│   │       ├── maintenance.ts # sync, repair, rebuild, reindex, prune, sync-frontmatter
│   │       ├── utility.ts     # rename, move, promote, archive, status
│   │       ├── bulk.ts        # bulk-link, bulk-delete, export, import
│   │       ├── suggest.ts     # suggest-links, summarize
│   │       ├── query.ts       # query, stats, impact
│   │       └── think.ts       # think subcommands
│   ├── core/                  # Core operations
│   │   ├── write.ts           # Memory creation/update
│   │   ├── read.ts            # Memory retrieval
│   │   ├── list.ts            # Memory listing
│   │   ├── delete.ts          # Memory deletion
│   │   ├── search.ts          # Keyword search
│   │   ├── semantic-search.ts # Embedding-based search
│   │   ├── tag.ts             # Tag operations
│   │   ├── frontmatter.ts     # YAML frontmatter parsing
│   │   ├── validation.ts      # Input validation
│   │   ├── slug.ts            # ID slug generation
│   │   ├── formatters.ts      # Output formatting
│   │   ├── export.ts          # Export functionality
│   │   ├── import.ts          # Import functionality
│   │   ├── fs-utils.ts        # Filesystem utilities
│   │   └── logger.ts          # Logging utilities
│   ├── graph/                 # Graph operations
│   │   ├── structure.ts       # Graph data structure
│   │   ├── link.ts            # Link/unlink operations
│   │   ├── edges.ts           # Edge queries
│   │   ├── traversal.ts       # Graph traversal
│   │   └── mermaid.ts         # Mermaid diagram generation
│   ├── scope/                 # Scope resolution
│   │   ├── resolver.ts        # 4-tier scope resolution
│   │   ├── config.ts          # Configuration loading
│   │   ├── defaults.ts        # Default paths
│   │   ├── enterprise.ts      # Enterprise scope handling
│   │   ├── git-utils.ts       # Git root detection
│   │   └── gitignore.ts       # Gitignore automation
│   ├── search/                # Search infrastructure
│   │   ├── embedding.ts       # Ollama embedding provider
│   │   ├── semantic.ts        # Semantic search engine
│   │   └── similarity.ts      # Cosine similarity
│   ├── suggest/               # Link suggestions
│   │   └── suggest-links.ts   # Auto-linking by similarity
│   ├── quality/               # Quality assessment
│   │   ├── health.ts          # Health checks
│   │   └── assess.ts          # Quality scoring
│   ├── maintenance/           # Maintenance operations
│   │   ├── sync.ts            # Graph/index/disk reconciliation
│   │   ├── sync-frontmatter.ts # Frontmatter sync
│   │   ├── rename.ts          # Memory renaming
│   │   ├── move.ts            # Scope migration
│   │   ├── promote.ts         # Type promotion
│   │   ├── archive.ts         # Archival
│   │   ├── prune.ts           # Temporary cleanup
│   │   └── reindex.ts         # Orphan re-indexing
│   ├── bulk/                  # Bulk operations
│   │   ├── bulk-link.ts       # Batch linking
│   │   ├── bulk-delete.ts     # Pattern-based deletion
│   │   └── pattern-matcher.ts # Pattern matching
│   ├── think/                 # Thinking documents
│   │   ├── document.ts        # Document operations
│   │   ├── thoughts.ts        # Thought management
│   │   ├── conclude.ts        # Conclusion/promotion
│   │   ├── state.ts           # Current document state
│   │   ├── discovery.ts       # Document discovery
│   │   ├── ai-invoke.ts       # Claude invocation
│   │   ├── frontmatter.ts     # Think-specific frontmatter
│   │   ├── id-generator.ts    # Document ID generation
│   │   └── validation.ts      # Think validation
│   └── types/                 # Type definitions
│       ├── memory.ts          # Memory entity types
│       ├── api.ts             # Request/response contracts
│       ├── operations.ts      # Bulk operation types
│       ├── think.ts           # Think document types
│       └── enums.ts           # MemoryType, Scope, Severity, etc.
├── graph.json                 # Skill's own memory graph
├── README.md                  # This file
├── SKILL.md                   # Skill metadata (quick reference)
└── tests/                     # Test fixtures
```

## Data Contract

JSON input for `memory write` (via stdin):

```json
{
  "title": "Human-readable title",
  "type": "decision|learning|artifact|gotcha|breadcrumb|hub",
  "scope": "enterprise|local|project|global",
  "content": "# Markdown body...",
  "tags": ["tag1", "tag2"],
  "links": ["other-memory-id"],
  "severity": "low|medium|high|critical",
  "source": "path/to/source/file.ts",
  "autoLink": true,
  "autoLinkThreshold": 0.85
}
```

- `title`, `type`, `content`, `tags`, `scope` required
- `id` is auto-generated from title (slug), can be overridden for imports
- `severity` optional, primarily for gotchas
- `links`, `source`, `autoLink`, `autoLinkThreshold` optional
- Default scope depends on configuration (typically `global`)

## Storage Layout

4-tier scope hierarchy (precedence: enterprise → local → project → global):

| Scope | Path | Purpose | Git-tracked |
|-------|------|---------|-------------|
| Enterprise | Configured via `CLAUDE_MEMORY_ENTERPRISE_PATH` | Organisation-wide memories | N/A |
| Local | `{git-root}/.claude/memory/local/` | Personal project-specific (private) | No (gitignored) |
| Project | `{git-root}/.claude/memory/` | Shared project memories | Yes |
| Global | `~/.claude/memory/` | Personal cross-project patterns | N/A |

Each scope contains: `permanent/`, `temporary/`, `graph.json`, `index.json`, `summary/`

## Quality Assessment

Detect stale, contradictory, and low-value memories using a 3-tier check system.

### Scoring

| Score | Rating | Action |
|-------|--------|--------|
| 90-100 | Excellent | None |
| 70-89 | Good | Optional review |
| 50-69 | Needs Attention | Review recommended |
| 25-49 | Poor | Review required |
| 0-24 | Critical | Immediate action |

### Tier 1: Deterministic (Fast)

- Stale file references (paths no longer exist)
- Age vs code freshness mismatch
- Graph isolation (no inbound/outbound edges)
- Missing embeddings

### Tier 2: Embedding-Based

- Near-duplicates (cosine similarity > 0.92)
- Cluster orphans (mean k-distance > 0.7)

### Tier 3: LLM-Powered (--deep only)

Uses Claude Haiku 4.5 via forked session for token efficiency:
- Contradiction detection between similar memories
- Supersession detection (newer replaces older)
- Semantic staleness (outdated concepts)

### Usage

```bash
memory quality <id>              # Single memory assessment
memory quality <id> --deep       # Include LLM semantic checks
memory audit local               # Scan all local memories
memory audit local --threshold 70  # Only show score < 70
memory audit-quick local         # Fast deterministic-only scan
```

Search results include `quality_warning` for cached low-score memories.

## Frontmatter Sync

Graph-modifying commands now automatically sync changes back to YAML frontmatter:

| Command | Updates |
|---------|---------|
| `link`, `unlink` | `links:` (outbound), `updated:` |
| `move` | `scope:`, `type:`, `updated:`, `links:` |
| `promote`, `demote` | `id:`, `tags:`, `updated:`, `links:` |
| `rename` | `id:`, `updated:`, `links:` |
| `tag`, `untag` | `tags:`, `updated:` |

This ensures `.md` files stay in sync with `graph.json` - no more stale frontmatter.

## Semantic Search & Auto-Link

### Semantic Search

Search memories by meaning rather than keyword matching:

```bash
memory semantic "error handling patterns" --limit 5
memory semantic "database design" --threshold 0.5
```

Uses existing embedding cache (from `suggest-links`) to find conceptually similar memories. "database persistence" will find "PostgreSQL storage decisions".

### Auto-Link on Write

Automatically link new memories to similar existing ones:

```bash
echo '{"id":"new-learning",...}' | memory write --auto-link
echo '{"id":"new-learning",...}' | memory write --auto-link-threshold 0.9
```

- Generates embedding synchronously (not background)
- Finds semantically similar memories above threshold (default: 0.85)
- Creates edges with relation `auto-linked-by-similarity`
- Reports count in response: `"auto_linked": 3`

## Thinking Sessions

Ephemeral working memory for brainstorming and deliberation. Store thoughts in `temporary/` that can optionally be promoted to permanent memories. Supports multi-AI collaboration with `--by` attribution.

### Why Use This Over Sequential Thinking MCP?

Unlike the `sequential-thinking` MCP server which provides ephemeral chain-of-thought that disappears after the session:

| Feature | Sequential Thinking MCP | Memory Think |
|---------|------------------------|--------------|
| **Persistence** | Lost after session | Stored in `.claude/memory/temporary/` |
| **Promotion** | Cannot save conclusions | `--promote` converts to permanent memory |
| **Audit Trail** | No record of deliberation | Full reasoning trail preserved |
| **Multiple Topics** | Single stream | Multiple concurrent documents |
| **Searchable** | No | Yes - via `memory search` |
| **Graph Integration** | None | Promoted memories join knowledge graph |

Use `memory think` when deliberation may inform future decisions or when you want an auditable record of why a choice was made.

### Workflow

```bash
# Create a thinking document
memory think create "Should we refactor the CLI module?"

# Add thoughts with attribution (--by is optional)
memory think add "Current implementation is 800 lines" --by Claude
memory think counter "But extraction increases indirection" --by Codex
memory think branch "Alternative: reorganise sections only" --by Gemini

# Review
memory think list              # List all thinking documents
memory think show              # View current document

# Conclude
memory think conclude "Extract validation module only"

# Or conclude and promote to permanent memory
memory think conclude "Extract validation only" --promote decision
```

### Storage

- Documents stored in `.claude/memory/temporary/think-*.md`
- Uses standard memory frontmatter with think-specific extensions (`topic`, `status`)
- Not added to graph during active state (keeps graph clean)
- Promoted memories include deliberation trail for audit
- Auto-pruned after 7 days via `memory prune`

### Multiple Documents

Can have multiple thinking documents active simultaneously:

```bash
memory think create "Topic A"      # Creates and sets as current
memory think create "Topic B"      # Creates new, now current
memory think use think-20260106-101500  # Switch back to earlier
memory think add "Thought for Topic A" --to think-20260106-101500  # Add to specific
```

### AI-Assisted Deliberation

Two modes for AI-assisted deliberation:

**Manual (`--by`)**: Track which contributor added each thought (metadata only).
**Automatic (`--call claude`)**: Invoke Claude to generate and add a thought.

**Customisation options:**
- `--style <name>`: Apply an output style (personality/tone) from `~/.claude/output-styles/`
- `--agent <name>`: Apply agent expertise from `~/.claude/agents/` (searches subdirs)
- `--resume <session-id>`: Continue a previous Claude conversation thread

**Example workflow:**
```bash
memory think create "Should we refactor the validation module?"
memory think add "Current implementation is 800 lines" --by Claude
memory think counter --call claude --style Devils-Advocate
memory think branch --call claude --style Pragmatist --agent rust-expert
memory think conclude "Extract validation only" --promote decision
```

**Output format:**
```
### 2026-01-09T13:06:53Z - Thought (Claude [656acbc8-3728-4f51-81b3-3187e96d00db])
Initial analysis of the problem

### 2026-01-09T13:07:15Z - Counter-argument (Claude [7a2f9c4e-8b1d-4e5f-9a3c-2d6e8f0b1c4a])
Counter-argument with Devils-Advocate style...
```

Each `--call claude` invocation generates a unique session ID shown in brackets after the author name. Use this ID with `--resume` to continue the same conversation thread:

```bash
# First thought creates a new session
memory think add --call claude "Analyze the trade-offs"
# Output: ### 2026-01-09T14:00:00Z - Thought (Claude [abc12345-...])

# Resume that session for follow-up
memory think add --call claude --resume abc12345-6789-... "What about performance?"
# Claude continues with full context from the previous exchange
```

**Why session resumption matters:**
- Maintains conversation context across multiple thoughts
- Allows iterative refinement without repeating background
- Different conversation threads can coexist in the same thinking document

The `--by`, `--call`, `--style`, `--agent`, and `--resume` parameters work with `add`, `counter`, and `branch`.

## Troubleshooting

### Memory Not Found

```bash
memory list | grep "my-memory"
memory read my-memory
```

### Graph Corruption

```bash
memory validate project
memory sync project
memory rebuild project  # Creates backup first
```

### Slow Semantic Search

```bash
# Clear embedding cache
rm -rf ~/.claude/memory/.embedding-cache
```

### suggest-links Fails

```bash
# Install embedding model
ollama pull embeddinggemma
```

### Scope Resolution Issues

The 4-tier scope hierarchy resolves in order: enterprise → local → project → global. If a memory isn't found, ensure you're specifying the correct scope:

```bash
memory read my-memory --scope local
memory read my-memory --scope project
memory read my-memory --scope global
```

### Index Format Mismatch

If you encounter errors about `relativePath` being undefined, run sync to migrate legacy index entries:

```bash
memory sync project
```

## Version

2.0.0
