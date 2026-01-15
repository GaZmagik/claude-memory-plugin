# Changelog

All notable changes to the Claude Memory Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-15

### Added

#### Core Memory System
- **CRUD Operations**: `write`, `read`, `list`, `search`, `delete` commands for memory management
- **Memory Types**: Support for decisions, learnings, gotchas, artifacts, and investigations
- **YAML Frontmatter**: Structured metadata with title, type, tags, severity, and timestamps
- **Slug Generation**: Automatic ID generation from titles with collision detection

#### 4-Tier Scope Resolution
- **Scope Hierarchy**: user (~/.claude/memory/), project (.claude/memory/), local (${PWD}), enterprise
- **Scope Precedence**: Automatic resolution with local > project > user > enterprise priority
- **Cross-Scope Search**: Unified search across all accessible scopes

#### Semantic Search & Embeddings
- **Ollama Integration**: Local embeddings via embeddinggemma model
- **Semantic Search**: `memory semantic "query"` for meaning-based retrieval
- **Auto-Linking**: `--auto-link` flag suggests relationships on write
- **Embedding Cache**: Performance optimisation with cached vectors

#### Graph Operations
- **Directed Graph**: Labelled, bidirectional edges between memories
- **Graph Commands**: `link`, `unlink`, `edges`, `graph`, `mermaid`
- **Hub Detection**: Automatic identification of highly-connected nodes
- **Impact Analysis**: `memory impact <id>` shows dependency chains

#### Quality & Health Monitoring
- **Health Checks**: `memory health`, `memory validate`, `memory sync`
- **Quality Scoring**: Automatic assessment of memory completeness
- **Orphan Detection**: Identify memories without graph connections
- **Repair Operations**: `memory repair` fixes common issues

#### Thinking Sessions
- **Ephemeral Documents**: `memory think create/add/counter/branch/conclude`
- **Promotion Workflow**: Convert thinking documents to permanent memories
- **Chain-of-Thought**: Documented deliberation before decisions

#### Hooks (9 Total)
- **PreToolUse**: `protect-memory-directory.ts` - Block direct writes to .claude/memory/
- **PreToolUse**: `enforce-memory-cli.ts` - Encourage CLI over bash commands
- **PostToolUse**: `memory-context.ts` - Inject gotchas when reading files
- **UserPromptSubmit**: `memory-context.ts` - Context injection on prompts
- **UserPromptSubmit**: `memory-skill-reminder.ts` - Remind to capture knowledge
- **UserPromptSubmit**: `memory-think-reminder.ts` - Suggest thinking sessions
- **SessionStart**: `start-memory-index.ts` - Inject memory summary at session start
- **SessionEnd**: `memory-cleanup.ts` - Capture memories on /clear
- **PreCompact**: `memory-capture.ts` - Capture memories before compaction

#### Commands (3 Total)
- `/memory:check-gotchas` - Search for relevant warnings before work
- `/memory:check-health` - Inspect memory system health
- `/memory:commit` - Capture memories from conversation context

#### Agents (2 Total)
- `memory:recall` - Query and restore memory context with resumable sessions
- `memory:curator` - Audit memory graph health and suggest improvements

### Security
- Command injection prevention via execFileSync
- Path traversal protection with absolute path validation
- Race condition prevention with atomic file writes
- Environment variable whitelisting for forked sessions

### Performance
- CRUD operations: <100ms target
- Graph operations: <500ms target
- Gotcha injection: <50ms latency
- Embedding cache for repeated queries

## [Unreleased]

### Planned
- Plugin marketplace integration
- Enterprise scope synchronisation
- Multi-model embedding support
