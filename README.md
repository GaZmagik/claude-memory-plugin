# Claude Memory Plugin

A comprehensive memory system for Claude Code - persistent knowledge storage with semantic search, contextual gotcha injection, and graph-based knowledge management.

## Overview

The Claude Memory Plugin extends Claude Code with a sophisticated memory system that:

- **Stores knowledge persistently** across sessions in structured memory files
- **Searches semantically** using embeddings to find relevant context
- **Injects gotchas proactively** via hooks when you read files with known pitfalls
- **Manages relationships** between memories using directed graphs
- **Supports multiple scopes** (global, project, local, enterprise) for knowledge isolation

## Requirements

- **Node.js** >= 18.0.0
- **Package manager**: Bun >= 1.0.0 or npm/yarn
- **Claude Code** >= 2.0.0
- **Ollama** (optional but recommended, for semantic search with local embeddings)

## Quick Start

### Installation

Using the Claude Code plugin interface:

```bash
# From Claude Code session
/plugin install /path/to/claude-memory-plugin
```

Or clone and install manually:

```bash
git clone https://github.com/GaZmagik/claude-memory-plugin
cd claude-memory-plugin

# Using Bun (recommended)
bun install    # This also runs 'bun link' to expose the 'memory' CLI command

# Then from Claude Code session
/plugin install .
```

> **Note**: The `memory` CLI command requires `~/.bun/bin` in your PATH. Add this to your shell profile if not already present:
> ```bash
> export PATH="$HOME/.bun/bin:$PATH"
> ```

This installs:
- The memory skill for knowledge storage
- Contextual hooks for automatic gotcha injection
- Agent definitions for memory analysis
- Slash commands for memory operations

### Basic Usage

```bash
# Use the memory CLI (after bun install)
memory help                       # Show available commands
memory list                       # List all memories
memory search "typescript"        # Full-text search
memory semantic "error handling"  # Semantic search by meaning
memory health local               # View memory health
memory stats local                # Graph statistics
```

### Architecture

```
claude-memory-plugin/
├── skills/memory/          # Memory skill system (core implementation)
├── hooks/                  # Claude Code integration hooks
│   ├── src/               # Shared hook utilities
│   ├── pre-tool-use/      # Block dangerous memory operations
│   ├── post-tool-use/     # Inject gotchas when reading files
│   ├── user-prompt-submit/# Context injection on prompts
│   ├── session-start/     # Initialise memory at session start
│   ├── session-end/       # Cleanup on /clear command
│   └── pre-compact/       # Capture memories before compaction
├── agents/                # Advanced memory agents
│   ├── recall.md          # Query and restore memory context
│   └── curator.md         # Audit memory graph health
├── output-styles/         # AI deliberation perspectives (15 styles)
│   ├── Architect.md       # System design perspective
│   ├── Devils-Advocate.md # Challenge assumptions
│   ├── Security-Auditor.md# Security-focused analysis
│   └── ...                # See full list below
└── commands/              # Slash commands
    ├── check-gotchas.md   # Search for relevant warnings
    ├── check-health.md    # Inspect memory system
    └── commit.md          # Capture memories before compaction
```

## Key Features

### 1. Persistent Memory Storage

Store decisions, learnings, gotchas, and artifacts in structured YAML files with:
- Full-text search
- Semantic search using embeddings
- Metadata tracking (created, updated, severity, tags)
- Multi-scope isolation (avoid mixing knowledge across projects)

### 2. Contextual Gotcha Injection

When you read a file with known pitfalls, the system automatically reminds you:

```
⚠️  FTS5 virtual tables can't be altered - requires drop/recreate
    (learning-fts5-migration, severity: HIGH)
```

Pattern matching ensures gotchas only trigger for relevant contexts (TypeScript files, React components, etc.).

### 3. Semantic Search

Find memories by meaning, not just keywords:

```bash
# Returns all memories about API design patterns
~/.claude/skills/memory/memory semantic "How should API parameters be validated?"
```

### 4. Memory Graph

Track relationships between memories:
- Decisions → their implementations
- Gotchas → related warnings
- Artifacts → code patterns they inspired
- Learnings → what caused them

### 5. Thinking Documents & AI Deliberation

Use ephemeral thinking documents for complex decisions with optional AI-assisted perspectives:

```bash
# Create a thinking document
memory think create "Should we use Redis or PostgreSQL for caching?"

# Add thoughts manually
memory think add "Redis offers sub-millisecond latency"
memory think counter "But PostgreSQL reduces operational complexity"

# Or get AI-assisted deliberation with different perspectives
memory think add "Evaluate caching options" --call claude --style Devils-Advocate
memory think add "Consider security implications" --call claude --style Security-Auditor
memory think add "Review system design" --call claude --agent typescript-expert

# Conclude and optionally promote to permanent memory
memory think conclude "Use PostgreSQL with UNLOGGED tables" --promote decision
```

**Available Output Styles** (15 perspectives for AI deliberation):

| Style | Perspective |
|-------|-------------|
| `Architect` | System design, scalability, maintainability |
| `Concise` | Brief, focused responses |
| `Debugger` | Root cause analysis, systematic debugging |
| `Devils-Advocate` | Challenge assumptions, find weaknesses |
| `Historian` | Historical context, precedent analysis |
| `Mentor` | Teaching, guidance, best practices |
| `Optimist` | Opportunities, positive framing |
| `Pair-Programmer` | Collaborative problem-solving |
| `Pragmatist` | Practical trade-offs, shipping focus |
| `Product-Manager` | User value, business impact |
| `Risk-Assessor` | Risk identification and mitigation |
| `Rubber-Duck` | Reflective questioning |
| `Security-Auditor` | Security vulnerabilities, threat modelling |
| `Simplifier` | Complexity reduction, clarity |
| `User-Advocate` | End-user experience focus |

## Security

The plugin includes comprehensive protections:

- **Command injection prevention**: Uses `execFileSync` with argument arrays (not shell interpolation)
- **Path traversal protection**: Validates absolute paths and prevents `../` escapes
- **Race condition prevention**: Atomic file writes with random temp file names
- **Directory protection**: Blocks accidental deletion/modification of memory files
- **Environment whitelisting**: Forked sessions only receive necessary env vars

### Protected Operations

These operations are blocked to prevent data loss:

```bash
rm -rf .claude/memory              # ✗ Blocked
cat .claude/memory/file.md         # ✓ Allowed (read-only)
echo "data" > .claude/memory/x.md  # ✗ Blocked
git rm --cached .claude/memory     # ✓ Allowed (git cleanup)
```

## Scopes

Memories are organized by scope:

| Scope | Location | Purpose | Visibility |
|-------|----------|---------|-----------|
| **Global** | `~/.claude/memory/` | Personal knowledge across projects | Only you |
| **Project** | `.claude/memory/` | Project-specific architecture decisions | Your team |
| **Local** | `${PWD}/.claude/memory/` | Current directory context | Temporary |
| **Enterprise** | Synced via Git | Shared team patterns | Whole org |

## Memory Types

### Decision
Architectural choices that explain why something is implemented a certain way.

```yaml
type: decision
title: Use IPFS CIDv1 for content addressing
severity: medium
tags: [architecture, storage, ipfs]
```

### Learning
Process insights, lessons learned, or best practices discovered.

```yaml
type: learning
title: TypeScript imports must use extensions in ES modules
severity: high
tags: [typescript, testing, gotcha]
```

### Gotcha
Warnings about common pitfalls that should be injected proactively.

```yaml
type: gotcha
title: GraphQL N+1 queries with nested fields
severity: critical
file_patterns: ["**/*.graphql", "**/*.ts"]
```

### Artifact
Reusable code patterns, templates, or techniques.

```yaml
type: artifact
title: Robust error boundary for React components
severity: low
tags: [react, error-handling]
```

## Commands

### Check Gotchas

Find relevant warnings for your current work:

```bash
/memory:check-gotchas typescript
/memory:check-gotchas
```

### Check Health

Inspect the memory system:

```bash
/memory:check-health local
/memory:check-health --fix
```

### Commit Memories

Capture memories before compaction or at session end:

```bash
/memory:commit precompact-trigger=context_threshold
/memory:commit session-end-trigger=user_clear
```

## Memory Skill Reference

The memory skill is installed at `~/.claude/skills/memory/memory`.

### Write a Memory

```bash
memory write \
  --title "My Decision" \
  --type decision \
  --content "Why we chose X instead of Y..." \
  --tags "architecture,database" \
  --severity high
```

### Search

```bash
# Full-text search
memory search "postgresql performance"

# Semantic search
memory semantic "How do I optimize query performance?"

# List by type
memory list gotcha
memory list learning --tag typescript

# Query with filters
memory query --type decision --scope local --tag "api"
```

### Read a Memory

```bash
memory read learning-typescript-imports
```

### Delete

```bash
memory delete learning-old-pattern
```

### Graph Operations

```bash
# View memory graph
memory mermaid local

# Check connectivity
memory graph local

# Find related memories
memory edges decision-ipfs-cid

# Suggest new links
memory suggest-links
```

### Health & Quality

```bash
# System health
memory health local
memory stats local
memory validate local

# Quality audit (checks for stale/duplicate memories)
memory audit local
memory audit-quick local  # Deterministic checks only
```

## Configuration

### Enable Hooks

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "ts": {
      "pre-tool-use": ["path/to/hooks/ts/pre-tool-use/*.ts"],
      "post-tool-use": ["path/to/hooks/ts/post-tool-use/*.ts"],
      "session-start": ["path/to/hooks/ts/session-start/*.ts"],
      "session-end": ["path/to/hooks/ts/session-end/*.ts"],
      "pre-compact": ["path/to/hooks/ts/pre-compact/*.ts"]
    }
  }
}
```

See `hooks/hooks.json` for the full configuration.

## Development

### Running Tests

```bash
bun test                 # Run all tests
bun test --coverage      # Generate coverage report
bun run build            # TypeScript compilation
bun run typecheck        # Type checking
```

### Adding a Memory Type

1. Add type to `skills/memory/src/types/enums.ts`
2. Create validation in `skills/memory/src/core/validation.ts`
3. Add formatters in `skills/memory/src/core/formatters.ts`
4. Write tests in `tests/unit/` and `tests/integration/`

### Debugging Hooks

Enable debug logging:

```bash
export DEBUG=*:memory-* 
# Re-run Claude Code session
```

Hook logs are written to `.claude/logs/`:
- `memory-context.log` - PostToolUse hook
- `protect-memory-directory.log` - PreToolUse hook
- `start-memory-index.log` - SessionStart hook

## Performance

Target response times:

- **Hook injection**: <50ms (blocks tool execution)
- **Semantic search**: <100ms (uses cached embeddings)
- **Memory write**: <200ms (includes index update)
- **Full audit**: <500ms (quality checks)

## Troubleshooting

### Memories Not Being Created

Check that the memory directory exists:
```bash
ls ~/.claude/memory/
```

Enable debug logging:
```bash
export DEBUG=memory:*
```

### Gotchas Not Showing

Verify memory files are readable:
```bash
memory health local
```

Check file patterns match your current file:
```bash
memory list gotcha  # Review file_patterns
```

### Slow Performance

The system caches embeddings. If slow:
```bash
rm -rf ~/.claude/memory/.embedding-cache
```

## Updating / Reinstalling

After modifying plugin code (hooks, skills, etc.), Claude Code needs a full reinstall to pick up changes:

```bash
# 1. Uninstall the plugin (from terminal, not Claude Code session)
claude plugin uninstall claude-memory-plugin@local-memory-plugin

# 2. Re-link the bun package (from plugin directory)
cd /path/to/claude-memory-plugin
bun unlink && bun link

# 3. Reinstall the plugin
claude plugin install claude-memory-plugin@local-memory-plugin

# 4. Restart Claude Code
```

> **Note**: Simply restarting Claude Code is not sufficient for hook changes - the full uninstall/reinstall cycle is required.

## Uninstallation

```bash
# From terminal
claude plugin uninstall claude-memory-plugin@local-memory-plugin
```

This removes all plugin components. Memory data in `.claude/memory/` is preserved (delete manually if needed).

## License

MIT - See LICENSE file for details

## Contributing

This plugin is developed following:
- **Specification-Driven Development** (SDD) - see `.specify/spec-driven.md`
- **Test-Driven Development** (TDD) - see `.specify/test-driven.md`
- **British English** throughout

All contributions should maintain 100% test coverage and follow the specification first.
