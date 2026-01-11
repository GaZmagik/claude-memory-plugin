# Memory Skill

Persistent knowledge storage for Claude Code sessions.

For the complete plugin documentation, see the [main README](../../README.md).

## Quick Reference

See [SKILL.md](SKILL.md) for:
- Full command reference (36 commands)
- Data contract and storage layout
- Quality assessment system
- Thinking sessions workflow

## Installation

This skill is typically installed as part of the claude-memory-plugin:

```bash
cd /path/to/claude-memory-plugin
./scripts/install.sh
```

## Usage Examples

### Store a Decision

```bash
echo '{
  "id": "decision-use-postgres",
  "title": "Use Postgres for Persistence",
  "type": "permanent",
  "scope": "local",
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
memory health local
memory validate local
memory stats local
```

### Graph Operations

```bash
# Link related memories
memory link decision-postgres learning-orm-issues "informed-by"

# View relationships
memory edges decision-postgres

# Generate diagram
memory mermaid local
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

## Wrapper Scripts

Specialised entry points with opinionated defaults:

| Script | Purpose | Example |
|--------|---------|---------|
| `learnings.sh` | Capture gotchas and tips | `learnings add "Title" << 'EOF'...EOF` |
| `decisions.sh` | Record ADRs | `decisions write << 'EOF'...EOF` |
| `artifacts.sh` | Store code patterns | `artifacts add "pattern-name" << 'EOF'...EOF` |
| `hubs.sh` | Manage navigation hubs | `hubs feature 004 "Feature Name"` |
| `breadcrumbs.sh` | Track investigation trails | `breadcrumbs add "Investigated X"` |

## Storage Locations

| Scope | Path | Purpose |
|-------|------|---------|
| Local | `{project}/.claude/memory/` | Project-specific memories |
| Global | `~/.claude/memory/` | Cross-project patterns |

Each scope contains:
- `permanent/` - Long-lived memories
- `temporary/` - Session-scoped (auto-pruned)
- `graph.json` - Node/edge relationships
- `index.json` - Metadata cache
- `summary/` - Aggregate summaries

## Troubleshooting

### Memory Not Found

```bash
memory list | grep "my-memory"
memory read my-memory
```

### Graph Corruption

```bash
memory validate local
memory sync local
memory rebuild local  # Creates backup first
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

## Version

This skill corresponds to version 1.0.0 of the claude-memory-plugin.

For the reference memory skill with additional features, see `~/.claude/skills/memory/`.
