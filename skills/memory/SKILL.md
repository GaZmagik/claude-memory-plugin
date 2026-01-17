---
name: memory
description: "Store and retrieve project knowledge - decisions, learnings, artifacts, gotchas. Provides ephemeral thinking documents for deliberation. Use for recording decisions, searching past knowledge, checking gotchas, linking memories, saving patterns. Trigger words - remember, store, save, record, decision, learning, gotcha, artifact, pattern, search memory, check gotchas, brainstorm, deliberate, pros and cons. Note - memory think preferred over sequential-thinking MCP as thoughts persist and can be promoted to permanent memories."
version: "2.0.0"
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

## Usage

The memory skill is a TypeScript CLI that runs on Bun.

### Prerequisites

**Install Bun** (if not already installed):
Visit https://bun.sh/docs/installation or run:
```bash
curl -fsSL https://bun.sh/install | bash
```

### Setup

From the plugin installation directory, run:
```bash
bun link
```

This creates a global `memory` command. The plugin directory is typically:
`~/.claude/plugins/cache/local-memory-plugin/claude-memory-plugin/1.0.0/`

### Invocation

```bash
memory <command> [options]
memory help                    # Quick reference
memory help --full             # Detailed documentation
memory <command> -h            # Command-specific help
```

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
| | `bulk-delete [options]` | Delete memories by pattern/type/tags (--dry-run) |
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

## Configuration

The plugin works out-of-the-box with sensible defaults. Power users can customise behaviour via `.claude/memory.local.md`.

**Quick Start:**
1. Copy `.claude/memory.example.md` to `.claude/memory.local.md`
2. Edit settings as needed
3. Add `.claude/*.local.md` to `.gitignore`

**Available Settings:**

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | `true` | Master switch for plugin |
| `ollama_host` | string | `http://localhost:11434` | Ollama API endpoint |
| `chat_model` | string | `gemma3:4b` | Model for summaries/chat |
| `embedding_model` | string | `embeddinggemma:latest` | Model for semantic search |
| `context_window` | number | `16384` | Max tokens for context |
| `health_threshold` | number | `0.7` | Graph health warning threshold |
| `semantic_threshold` | number | `0.45` | Semantic search similarity cutoff |
| `auto_sync` | boolean | `false` | Run memory sync on session start |

**Example Configuration:**
```yaml
---
ollama_host: http://192.168.1.100:11434
chat_model: llama3.2
embedding_model: nomic-embed-text
---
```

See `.claude/memory.example.md` for full documentation.

## Requirements

- **Bun** - TypeScript runtime (install via `bun link` from plugin root)
- **Ollama** (optional) - Required for semantic features:
  - `semantic` search by meaning
  - `write --auto-link` automatic linking
  - `suggest-links` relationship suggestions
  - `refresh --embeddings` embedding generation

  Install: `ollama pull embeddinggemma` (see [Ollama docs](https://ollama.ai/))

  Without Ollama, semantic features gracefully fall back to keyword search.
  The plugin continues to function for core operations (memory storage, graph management, keyword search).

## Full Documentation

See [README.md](README.md) for detailed documentation on:
- Architecture and code structure
- Data contracts and storage layout
- Quality assessment system
- Semantic search and auto-linking
- Thinking sessions workflow
- Troubleshooting guide
