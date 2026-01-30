# Changelog

All notable changes to the Claude Memory Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-01-28

### Added

#### Settings Versioning
- **Settings schema version tracking**: New `settings_version` field in `memory.local.md` to detect outdated configs
- Future-proof configuration migration path for when new settings are introduced

#### Reminder Improvements
- **Configurable reminder frequency**: New `reminder_count` setting controls how many times reminders show per session
  - Default: `1` (show once per session)
  - Range: `0` (disabled) to `10` (show first 10 prompts)
- **Consolidated reminder hook**: Merged `memory-skill-reminder.ts` and `memory-think-reminder.ts` into single `memory-reminders.ts`
- Session-scoped reminder tracking using enhanced SessionCache key-value storage

#### Ollama Optimisations
- **Model pre-warming at session start**: Reduces PostToolUse cold-start latency by loading chat model on SessionStart
- **Configurable keep-alive**: New `ollama_keep_alive` setting controls how long models stay loaded (default: `5m`)
  - Eliminates repeated cold-start delays within sessions
  - Configurable: `5m`, `10m`, `30m`, `60m`

#### Performance Options
- **Post-clear session skip**: New `skip_hooks_after_clear` setting to skip heavy operations after `/clear`
  - Skips: semantic search, health checks, deliberation lists
  - Shows: minimal memory index summary
  - Use case: Fresh start with minimal context injection

### Changed

#### SessionCache Enhancements
- Added key-value storage methods: `get()` and `set()`
- Extended `CacheEntry` interface with optional `value` field
- Maintains backward compatibility with hash-based deduplication

#### Hook Registration Updates
- SessionStart: Added `ollama-prewarm.ts` hook (15s timeout)
- UserPromptSubmit: Replaced two reminder hooks with consolidated `memory-reminders.ts`

### Removed
- `hooks/user-prompt-submit/memory-skill-reminder.ts` (replaced by `memory-reminders.ts`)
- `hooks/user-prompt-submit/memory-think-reminder.ts` (replaced by `memory-reminders.ts`)

### Documentation
- Added v1.2.0 settings reference to `memory.example.md`
- Documented reminder configuration patterns
- Documented performance options for post-clear sessions

## [1.1.2] - 2026-01-26

### Fixed

#### Marketplace Plugin Installation
- PostToolUse hooks now fire correctly for marketplace-installed plugins
- Added `matcher: "*"` to PostToolUse hook configuration for proper user-level hook merging
- Increased PostToolUse timeout from 10s to 30s (Ollama model loading can take 10-30s)
- SessionStart hook now auto-installs dependencies if `node_modules` is missing
- Increased SessionStart check-bun-installed timeout from 3s to 30s for `bun install` completion

## [1.1.1] - 2026-01-26

### Fixed

#### Provider Integration Hotfix
- `--call codex` and `--call gemini` now correctly route to provider CLIs (was silently falling back to Claude)
- Unified timeout to 120s across all providers for MCP startup reliability
- Fixed error message showing wrong timeout value (30s vs actual 120s)
- Fixed Codex default model: `gpt-5-codex` → `gpt-5.2-codex` to match CLI output

### Security
- Added model name sanitisation to prevent argument injection attacks
- Added error message path redaction to prevent information leakage
- Added timeout bounds validation (5s min, 5min max)
- Added comprehensive security tests for `sanitiseModelName` and `validateTimeout`

### Changed
- Gemini parser now documents JSON format assumption (double-quoted only)
- Exit code handling comment clarified for maintainability
- `DEFAULT_TIMEOUT_MS` increased from 30s to 120s in `invoke.ts`

## [1.1.0] - 2026-01-25

### Added

#### US1: Enhanced Hint Visibility
- Progressive disclosure of CLI hints via stderr (first 3 invocations per command)
- Interactive prompts for complex thoughts (>200 chars or containing "?")
- `--non-interactive` flag to suppress hints and prompts
- Rotating hint system with examples for `--call`, `--style`, `--agent` flags

#### US2: Auto-Selection with --auto Flag
- `--auto` flag for AI-powered style/agent selection
- Tiered selection strategy: Ollama → Heuristics → Default
- Circuit breaker pattern (3 failures → 30s cooldown) for Ollama resilience
- Keyword-based heuristic matching for security, performance, architecture topics
- Avoid list extraction to ensure diverse style/agent rotation
- Spinner display during Ollama analysis

#### US3: Enhanced Memory Injection
- Opt-in injection of decisions and learnings (in addition to gotchas)
- Per-type threshold multipliers for context-sensitive injection
- Hook multipliers: Bash 1.2x, Edit/Write 0.8x
- Session deduplication to prevent repeated injections
- Type-specific formatting with icons (🚨 📋 💡)
- Single semantic search with client-side filtering for efficiency

#### US4: Cross-Provider Agent Calling
- `--call codex` and `--call gemini` support alongside `--call claude`
- `--oss` flag for Codex local models (gpt:oss-20b/120b)
- Provider-specific output parsing (strips headers, filters noise)
- Graceful error messages with installation instructions
- 30-second timeout for provider CLI invocations (FR-045)
- Thought attribution formatting (e.g., "Claude (haiku) [Style] @agent")

### Changed
- Think commands now support provider routing via `--call <provider>`
- Default provider remains `claude` for backward compatibility

## [1.0.8] - 2026-01-24

### Fixed
- Removed `hooks` field from plugin.json to fix "Duplicate hooks file detected" error
- Claude Code auto-discovers `hooks/hooks.json` - explicit declaration caused duplication

## [1.0.7] - 2026-01-24

### Fixed
- Changed `agents` field from directory path to explicit file array
- Directory path (`"./agents/"`) was rejected by plugin validator; file array works (`["./agents/curator.md", "./agents/recall.md"]`)

## [1.0.6] - 2026-01-24

### Fixed
- Reverted plugin.json paths from `../` back to `./` (paths are relative to plugin root, not plugin.json)
- Plugin root is the directory containing `.claude-plugin/`, so `./` paths are correct

## [1.0.5] - 2026-01-24

### Fixed
- Fixed output styles discovery failing when running `memory` from user's project directory (Issue #18)
- Plugin now resolves its root via `import.meta.url` instead of `process.cwd()`
- Clarified scope distinctions for output styles paths (PR #19 feedback):
  - **User paths** (local/global): Use `output-styles/` directory convention (unchanged)
  - **Plugin paths**: Use `outputStyles` field from `plugin.json` (default: `styles/`)
- Added debug logging in `resolvePluginRoot()` catch block for troubleshooting
- Extracted magic number for traversal depth to `MAX_PLUGIN_ROOT_TRAVERSAL_DEPTH` constant

### Added
- Added explicit component paths to plugin.json: `commands`, `agents`, `skills`, `hooks`, `outputStyles`
- Added `readPluginJson()` helper to parse `plugin.json` for configuration fields
- Added comprehensive tests for `outputStyles` field handling from `plugin.json`

## [1.0.4] - 2026-01-22

### Added
- Auto-provision `memory.example.md` config template for first-time users
- Template file stored in `hooks/memory-example.md` as single source of truth
- Hook checks for existing `memory.local.md` or `memory.example.md` before provisioning

### Changed
- UserPromptSubmit hook now provisions config on first message submission (non-blocking)

## [1.0.3] - 2026-01-21

### Fixed
- Fixed duplicated type prefix bug in memory file naming (e.g., `gotcha-gotcha-*.md` → `gotcha-*.md`)
- Added `stripTypePrefix()` function to sanitize titles before ID generation
- Updated both `generateId()` and `generateMemoryId()` to prevent prefix duplication from any source

### Changed
- ID generation now strips existing type prefixes defensively to prevent duplication regardless of input source

## [1.0.2] - 2026-01-20

### Fixed

#### PostToolUse Hook Settings
- **Context Window Ignored**: Fixed `post-tool-use/memory-context.ts` not respecting `context_window` setting
  - Root cause: Hook never loaded settings from `memory.local.md`, always used default 32768
  - Solution: Load settings at hook startup, pass `num_ctx` to all three Ollama generate() calls
  - Impact: Topic extraction, gotcha summarisation, and write suggestions now respect user configuration

## [1.0.1] - 2026-01-18

### Fixed

#### Memory Capture Hook
- **ARG_MAX Limit**: Fixed silent failure when session context exceeded kernel argument size limit
  - Root cause: 225KB context passed via `--append-system-prompt` exceeded ARG_MAX
  - Solution: Skip thinking blocks, truncate tool results, cap total at 80KB
  - Result: Context reduced from 225KB to ~55KB

#### Setup Command
- **Embedded Template**: `memory setup` now works from any project directory
  - Previously required `.claude/memory.example.md` in current directory
  - Now embeds the settings template directly in the code

### Changed
- Tool result truncation reduced from 500 to 150 characters (context efficiency)
- Tool use input truncation added at 200 characters
- Documentation updated to use `memory setup` instead of manual file copy

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
