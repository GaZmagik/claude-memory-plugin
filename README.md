# Claude Memory Plugin

A comprehensive memory system for Claude Code - persistent knowledge storage with semantic search, contextual gotcha injection, and graph-based knowledge management.

## Overview

The Claude Memory Plugin extends Claude Code with a sophisticated memory system that:

- **Stores knowledge persistently** across sessions in structured memory files
- **Searches semantically** using embeddings to find relevant context
- **Injects gotchas proactively** via hooks when you read files with known pitfalls
- **Manages relationships** between memories using directed graphs
- **Supports multiple scopes** (global, project, local, enterprise) for knowledge isolation
- **Supports agent-scoped namespaces** so specialised agents maintain isolated knowledge bases

## Requirements

- **[Bun](https://bun.sh/docs/installation)** >= 1.0.0 (required - used for hooks, CLI, and package management)
- **Claude Code** >= 2.0.0
- **Ollama** (optional but recommended, for semantic search with local embeddings)

## Quick Start

### Installation

Using the [Enhance marketplace](https://github.com/GaZmagik/enhance):

```bash
# Add the marketplace (one-time)
/plugin marketplace add GaZmagik/enhance

# Install the plugin
/plugin install claude-memory-plugin
```

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

### v1.1.0 Features

#### AI-Powered Thinking with `--auto` and `--call`

```bash
# Auto-select style/agent based on thought content
memory think add "Review security implications" --call claude --auto

# Cross-provider calling (claude, codex, gemini)
memory think add "Analyse performance" --call codex --model gpt-5-codex
memory think counter "Alternative view" --call gemini

# Explicit style and agent
memory think add "Deep dive" --call claude --style Devils-Advocate --agent security-reviewer
```

#### Progressive Hints

First 3 invocations of each think command show helpful hints about available flags. Use `--non-interactive` to suppress.

#### Cross-Provider Requirements

Ensure the CLI is installed for your chosen provider. If missing, helpful installation instructions are shown:
- **claude**: Pre-installed with Claude Code
- **codex**: `npm install -g @openai/codex`
- **gemini**: `npm install -g @google/gemini-cli`

The `--auto` flag uses a tiered selection strategy: Ollama (if available) → keyword heuristics → default style.

#### Enhanced Memory Injection

Configure in `.claude/memory.local.md` to inject decisions and learnings alongside gotchas:

```yaml
injection:
  types:
    decision:
      enabled: true
      threshold: 0.35
    learning:
      enabled: true
      threshold: 0.4
```

Hook multipliers adjust thresholds by context (Edit/Write: 0.8×, Bash: 1.2×). See `.claude/memory.example.md` for full options.

### v1.3.0 Features

#### Agent-Scoped Memories

Agents can now maintain their own isolated memory namespaces, separate from project and global memories:

```bash
# Write a memory scoped to an agent
memory write --title "ESM imports require .js extensions" --type learning --agent typescript-expert

# Read agent-scoped memories
memory list --agent typescript-expert
memory search "imports" --agent typescript-expert

# Include shared project memories in results
memory search "imports" --agent typescript-expert --include-shared

# List all known agents
memory agents
```

Agent memories are stored in `.claude/memory/agents/{agent-name}/` (project scope) or `~/.claude/memory/agents/{agent-name}/` (global scope). Each agent gets its own index, graph, and memory files.

#### Agent CLI Flags

| Flag | Description |
|------|-------------|
| `--agent <name>` | Target an agent's memory namespace |
| `--include-shared` | Include project/global memories in read operations |
| `--all-agents` | Apply to all agents (for listing/stats) |
| `--target-agent <name>` | Target agent for cross-agent linking |

All existing commands work unchanged without `--agent` — full backward compatibility.

### v1.4.0 Features

#### Cross-Scope Auto-Linking

The `suggest-links` command now creates cross-scope links automatically when using `--auto-link`:

```bash
# Suggest and auto-create links within agent scope + shared scopes
memory suggest-links --agent typescript-expert --include-shared --auto-link

# Suggest and auto-create links across ALL scopes (project, global, all agents)
memory suggest-links --all-scopes --auto-link

# Review suggestions without creating links
memory suggest-links --agent typescript-expert --include-shared
```

**How it works**:
- Tracks metadata (basePath, scope, agent) for all loaded memories
- Detects cross-scope boundaries during suggestion generation
- Routes same-scope links to `linkMemories()` (single graph write)
- Routes cross-scope links to `storeCrossScopeEdge()` (dual graph write)
- Reports separate counts: `createdSameScope` and `createdCrossScope`

**New flags**:
- `--all-scopes`: Load embeddings from project, global, AND all agent scopes for comprehensive link discovery
- Mutual exclusivity: `--all-scopes` and `--include-shared` cannot be used together

#### Agent Retrospective System

Agents are now prompted to capture learnings after completing work:

**PostToolUse:Task Hook**:
- Triggers when subagents complete tasks
- Detects agent identity from multiple sources (--agent flag, CLAUDE_AGENT_NAME env var)
- Classifies work significance (trivial vs meaningful)
- Injects retrospective guidance for meaningful work
- Performance: <25ms execution with early exit

**agent-commit Command** (`/commands/agent-commit.md`):
- Guided workflow for agents to save learnings
- Enforces `--agent` flag for agent-scoped memories
- Dual-save pattern: memory plugin + MEMORY.md (both required for redundancy)
- Project scope option for team-relevant learnings
- Includes embedding generation and cross-scope linking

**Usage**:
```bash
# Agent saves a learning to its own namespace
memory write --type learning --title "Title" --content "Description" --agent typescript-expert --auto-link

# Generate embeddings and discover cross-scope links
memory refresh --embeddings
memory suggest-links --agent typescript-expert --include-shared --auto-link
```

#### Enhanced Commit Workflows

The `/commit` command now includes:

**Scope Suggestions** (Step 2):
- Heuristics to recommend project vs global scope before saving
- Project: team decisions, architecture, shared patterns
- Global: personal workflows, tooling preferences, cross-project learnings

**Embedding + Linking Workflow** (Step 3):
```bash
# After creating memories, generate embeddings
memory refresh --embeddings

# Auto-link across ALL scopes (project, global, all agents)
memory suggest-links --all-scopes --auto-link
```

This ensures memories are connected across the entire knowledge graph, not just within their own scope.

### v1.5.0 Features

#### External File Indexing (Rules & Reminders)

The memory system now automatically discovers and indexes external Claude configuration files as read-only graph nodes, making project rules and agent reminders searchable and linkable:

**Discovered Files**:
- **CLAUDE.md** (project root and ancestor directories)
- **.claude/CLAUDE.md** (dotfile variant)
- **.claude/rules/*.md** (rules directory files)
- **.claude/agent-memory/{agent}/MEMORY.md** (agent memory summaries)
- **.claude/agent-memory/{agent}/*.md** (agent sub-files like patterns.md, gotchas.md)

**New Node Types**:

| Type | ID Format | Mermaid Shape | Purpose |
|------|-----------|---------------|---------|
| **Rule** | `rule-project-claude-md-root` | Hexagon `{{}}` | Project rules and guidelines from CLAUDE.md |
| **Reminder** | `reminder-project-{agent}-memory` | Cylinder `[( )]` | Agent memory summaries and knowledge |

**New Edge Types**:

| Type | Direction | Purpose | Example |
|------|-----------|---------|---------|
| **governed-by** | Decision → Rule | Links decisions to governing rules | Decision to use TDD → CLAUDE.md TDD rule |
| **reminded-by** | Gotcha/Learning → Reminder | Links insights to agent memories | TypeScript gotcha → typescript-expert MEMORY.md |

**Read-Only Protection**:

External nodes cannot be modified via memory commands - they must be edited at their source:

```bash
# ✗ Blocked - cannot modify rule nodes
memory write rule-project-claude-md-root --content "new content"
# Error: Cannot modify read-only external node 'rule-project-claude-md-root'
# External nodes are synced from source files via 'memory sync'

# ✓ Allowed - read external content
memory read rule-project-claude-md-root

# ✓ Allowed - link to external nodes
memory link decision-use-tdd rule-project-claude-md-root --relation governed-by

# ✓ Allowed - search includes external nodes
memory search "TDD"  # Returns both regular memories AND rule nodes
```

**Automatic Indexing**:

External files are indexed automatically during sync:

```bash
# Full sync - indexes all files (project memories + external files)
memory sync

# Quick refresh - only re-indexes changed external files
memory index-context

# Dry run - preview what would be indexed
memory index-context --dry-run
```

**Performance Optimisation**:

The `index-context` command uses content hash-based change detection:
- Only regenerates embeddings for modified files
- Reuses cached embeddings for unchanged files
- Much faster than full sync for incremental updates

**Usage Examples**:

```bash
# Discover what rules exist in your project
memory list --type rule

# Find which decisions are governed by project rules
memory edges rule-project-claude-md-root

# Link a decision to a governing rule
memory link decision-authentication-approach rule-project-security --relation governed-by

# Link a gotcha to an agent's memory
memory link gotcha-async-pitfall reminder-project-typescript-expert-memory --relation reminded-by

# Search across regular memories AND external files
memory semantic "testing best practices"

# View Mermaid diagram with rules (hexagons) and reminders (subroutines)
memory mermaid --scope project
```

**Scope Behaviour**:

External files are indexed at the scope where they're discovered:
- CLAUDE.md in project root → `rule-project-*` (Project scope)
- CLAUDE.md in home directory → `rule-global-*` (Global scope)
- Agent MEMORY.md files → `reminder-project-{agent}-*` (Agent-Project scope)

**Auto-Discovery**:

External files are discovered via:
1. **Tree walking**: CLAUDE.md files from current directory up to git root and home
2. **Directory scanning**: `.claude/rules/` and `.claude/agent-memory/` directories
3. **Vendor filtering**: Excludes `node_modules`, `.git`, `dist`, etc.
4. **Symlink resolution**: Follows symlinks with loop detection

**Integration with Suggest-Links**:

Rule and reminder nodes participate in semantic link suggestions:

```bash
# Rules and reminders appear as candidates when semantically similar
memory suggest-links --auto-link

# Example: A decision about TDD might suggest linking to the TDD rule in CLAUDE.md
# Suggestion: decision-use-tdd → rule-project-claude-md-root (similarity: 0.87)
```

### Architecture

```
claude-memory-plugin/
├── skills/memory/          # Memory skill system (core implementation)
│   ├── src/scope/         # Scope resolution (now with agent scopes)
│   ├── src/agents/        # Agent directory scanning and info
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
| **Local** | `${PWD}/.claude/memory/local/` | Current directory context (gitignored) | Only you |
| **Enterprise** | Synced via Git | Shared team patterns | Whole org |
| **Agent-Project** | `.claude/memory/agents/{name}/` | Agent knowledge within a project | Your team |
| **Agent-Global** | `~/.claude/memory/agents/{name}/` | Agent knowledge across projects | Only you |

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

### Agent-Scoped Operations

```bash
# Write to agent scope
memory write --title "Pattern" --type learning --agent typescript-expert

# Search within agent scope
memory search "pattern" --agent typescript-expert

# Search agent + shared scopes
memory search "pattern" --agent typescript-expert --include-shared

# List all agents
memory agents

# Agent stats and health
memory stats --agent typescript-expert
memory health --agent typescript-expert

# Agent graph visualisation
memory mermaid --agent typescript-expert --include-shared
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

### Hooks

Hooks are installed automatically when the plugin is installed via the Claude Code marketplace. No manual configuration is required.

The plugin registers hooks for:
- **PreToolUse**: Gotcha injection when reading files with known pitfalls
- **PostToolUse**: Memory context suggestions after bash/read operations
- **UserPromptSubmit**: Memory skill reminders and context loading
- **PreCompact**: Memory capture before context compaction
- **SessionStart/SessionEnd**: Session state management

See `hooks/hooks.json` for the full hook configuration.

### Ollama Integration

The plugin uses [Ollama](https://ollama.ai) for local AI features. Both models gracefully degrade if Ollama isn't running.

| Model | Default | Purpose |
|-------|---------|---------|
| **Embedding** | `embeddinggemma:latest` | Semantic search, similarity matching, link suggestions |
| **Chat** | `gemma3:4b` | Topic extraction, gotcha summarisation, context prompts |

Configure models in `.claude/memory.local.md` (gitignored). Create the settings file:

```bash
memory setup
```

Then edit to customise:

```yaml
---
embedding_model: embeddinggemma:latest
chat_model: gemma3:4b
ollama_host: http://localhost:11434
---
```

Install the default models:

```bash
ollama pull embeddinggemma:latest
ollama pull gemma3:4b
```

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

### Version Upgrades

When the plugin is updated to a new version, the `memory` CLI is automatically re-linked via `postinstall` on SessionStart. No manual intervention required.

## Uninstallation

```bash
# From terminal
claude plugin uninstall claude-memory-plugin
```

This removes all plugin components. Memory data in `.claude/memory/` is preserved (delete manually if needed).

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

This plugin is developed following:
- **Specification-Driven Development** (SDD)
- **Test-Driven Development** (TDD)

All contributions should maintain 100% test coverage where possible and follow the specification first.
