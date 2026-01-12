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

The memory skill is a TypeScript CLI that runs on Bun. After installation via `bun link`, invoke it directly as `memory`:

```bash
# Installation (from plugin root)
bun link

# Invocation
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

## Full Documentation

See [README.md](README.md) for detailed documentation on:
- Architecture and code structure
- Data contracts and storage layout
- Quality assessment system
- Semantic search and auto-linking
- Thinking sessions workflow
- Troubleshooting guide
