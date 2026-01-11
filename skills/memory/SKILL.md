---
name: memory
description: "Store and retrieve project knowledge - decisions, learnings, artifacts, gotchas. Provides ephemeral thinking documents for deliberation. Use for recording decisions, searching past knowledge, checking gotchas, linking memories, saving patterns. Trigger words - remember, store, save, record, decision, learning, gotcha, artifact, pattern, search memory, check gotchas, brainstorm, deliberate, pros and cons. Note - memory think preferred over sequential-thinking MCP as thoughts persist and can be promoted to permanent memories."
version: "1.0.0"
---

## Purpose

Persist project knowledge across sessions. Record decisions, capture learnings, store code patterns, and retrieve context when needed. Prevents knowledge loss and repeated mistakes.

## When to Invoke

- Recording decisions, learnings, gotchas, or artifacts
- User says "remember", "store", "save", "record this"
- User asks "what did we decide about...", "why did we..."
- Before starting significant work (check gotchas first!)
- After fixing non-obvious bugs or making architectural decisions
- When deliberating on complex choices (use `think` commands)
- User says "brainstorm", "weigh options", "think through", "pros and cons"
- When you need documented chain-of-thought before committing to a decision

## Command Reference

Run `memory help` for quick reference, or `memory <command> -h` for command-specific help.

| Category | Command | Description |
|----------|---------|-------------|
| **CRUD** | `write [--auto-link]` | Create/update memory from JSON stdin |
| | `read <id>` | Read a memory by ID |
| | `list [type] [tag]` | List memories with optional filters |
| | `search <query>` | Search titles and content |
| | `semantic <query>` | Search by meaning using embeddings |
| | `delete <id>` | Delete a memory |
| **Graph** | `link <from> <to>` | Create relationship edge |
| | `unlink <from> <to>` | Remove relationship edge |
| | `bulk-link [file]` | Create multiple links from JSON |
| | `edges <id>` | Show inbound/outbound edges for node |
| | `graph [scope]` | Output graph as JSON |
| | `mermaid [options]` | Generate Mermaid diagram |
| | `remove-node <id>` | Remove node from graph (keeps file) |
| **Analysis** | `stats [scope]` | Graph statistics (ratio, hubs, sinks) |
| | `query [options]` | Filter memories (type, tags, edges) |
| | `impact <id>` | Show what depends on a memory (--json, --depth) |
| **Tags** | `tag <id> <tags...>` | Add tags to memory |
| | `untag <id> <tags...>` | Remove tags from memory |
| **Quality** | `quality <id>` | Assess quality score (--deep for LLM) |
| | `audit [scope]` | Bulk quality scan (--threshold, --deep) |
| | `audit-quick [scope]` | Fast deterministic-only audit |
| **Maintenance** | `health [scope]` | Quick health check with score |
| | `validate [scope]` | Detailed validation with issues |
| | `sync [scope]` | Reconcile graph, index, and disk |
| | `repair [scope]` | Run sync then validate |
| | `rebuild [scope]` | Rebuild from disk (use with caution) |
| | `reindex <id>` | Re-index an orphan file |
| **Utility** | `rename <old> <new>` | Rename memory ID (updates refs) |
| | `move <id> <scope>` | Move between local/global |
| | `promote <id> <type>` | Convert memory type (preserves edges) |
| | `demote <id> <type>` | Reverse conversion (alias for promote) |
| | `prune` | Remove expired temporaries |
| | `status` | Show system status |
| | `summarize [type]` | Generate summary rollups |
| | `archive <id>` | Archive a memory |
| | `suggest-links` | Suggest relationships (cached embeddings) |
| | `export [scope]` | Export graph snapshot to JSON |
| | `import <file>` | Import graph snapshot (--merge/replace) |
| | `sync-frontmatter [scope]` | Bulk sync frontmatter from graph.json |
| **Thinking** | `think create <topic>` | Create ephemeral thinking document |
| | `think add <thought>` | Add thought to current document |
| | `think counter <thought>` | Add counter-argument |
| | `think branch <thought>` | Add alternative/branch |
| | `think list` | List all thinking documents |
| | `think show [id]` | View document contents |
| | `think use <id>` | Switch current document |
| | `think conclude <text>` | Conclude (--promote type to save) |
| | `think delete <id>` | Delete thinking document |

## Script Architecture

```
~/.claude/skills/memory/
├── memory.sh              # Main dispatcher (36 commands)
├── lib/
│   ├── core.sh            # Shared utilities and paths
│   ├── health.sh          # health, validate commands
│   ├── mermaid.sh         # Mermaid diagram generation
│   ├── similarity.sh      # Cosine similarity for embeddings
│   ├── llm.sh             # Haiku 4.5 forked session integration
│   └── commands/          # Modular command implementations
│       ├── write.sh       ├── read.sh        ├── list.sh
│       ├── search.sh      ├── delete.sh      ├── link.sh
│       ├── graph.sh       ├── prune.sh       ├── status.sh
│       ├── summarize.sh   ├── suggest.sh     ├── archive.sh
│       ├── rebuild.sh     ├── sync.sh        ├── repair.sh
│       ├── reindex.sh     ├── tag.sh         ├── rename.sh
│       ├── move.sh        ├── edges.sh       ├── bulk.sh
│       ├── stats.sh       ├── query.sh       ├── promote.sh
│       ├── snapshot.sh    ├── sync-frontmatter.sh
│       ├── quality.sh     # Quality assessment (quality command)
│       ├── audit.sh       # Bulk quality audit
│       ├── semantic.sh    # Semantic search using embeddings
│       ├── think.sh       # Ephemeral thinking documents
│       └── impact.sh      # Dependency impact analysis
├── breadcrumbs.sh         # Investigative trail wrapper
├── decisions.sh           # ADR pipeline wrapper
├── artifacts.sh           # Pattern catalogue wrapper
├── learnings.sh           # Gotcha/learning wrapper
└── hubs.sh                # Hub management wrapper
```

## Data Contract

JSON input for `memory.sh write` (via stdin):

```json
{
  "id": "project-topic",
  "title": "Human-readable title",
  "type": "permanent|temporary",
  "scope": "local|global",
  "tags": ["tag1", "tag2"],
  "links": ["other-memory-id"],
  "content": "# Markdown body..."
}
```

- `id`, `title`, `type`, `content` required
- `scope` defaults to `local`
- Use `{project}-` prefix for IDs to prevent collisions

## Storage Layout

| Scope | Path | Purpose |
|-------|------|---------|
| Local | `{project}/.claude/memory/` | Project-specific memories |
| Global | `~/.claude/memory/` | Cross-project patterns |

Each contains: `permanent/`, `temporary/`, `graph.json`, `index.json`, `summary/`

## Quality Assessment

Detect stale, contradictory, and low-value memories using a 3-tier check system:

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

## Full Documentation

See [README.md](README.md) for:
- Detailed command usage with examples
- Wrapper script documentation
- Hub navigation and memory loops
- Maintenance workflows
- Troubleshooting guide
