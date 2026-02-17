# Changelog

All notable changes to the Claude Memory Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-02-17

### Added

#### Cross-Scope Auto-Linking
- **suggest-links --auto-link now creates cross-scope links** - Routes cross-scope suggestions to `storeCrossScopeEdge()` for bidirectional graph writes, same-scope to `linkMemories()`
- Metadata tracking (basePath, scope, agent) during multi-scope loading enables cross-scope detection
- Separate count reporting: `createdSameScope` and `createdCrossScope` fields in response
- Example: `memory suggest-links --agent typescript-expert --include-shared --auto-link`

#### Agent Retrospective System
- **PostToolUse:Task hook** - Triggers after agents complete meaningful work, injects retrospective guidance (<25ms execution)
- **agent-commit command** (`/commands/agent-commit.md`) - Guided workflow enforcing dual-save pattern (memory plugin + MEMORY.md)
- **Agent detection utilities** - Multi-source identity resolution: --agent flag > env var > context
- **Work classifier** - Heuristic-based significance detection (meaningful vs trivial work)

#### Enhanced Commit Workflows
- **Scope suggestion guidance** - Heuristics help choose project vs global vs agent scope before saving
- **--all-scopes flag** for suggest-links - Loads embeddings from project, global, AND all agent scopes for complete knowledge graph linking
- **Embedding + linking workflow** - Both commit commands now include `memory refresh --embeddings` and `memory suggest-links --auto-link` steps

### Changed
- suggest-links response includes `createdSameScope` and `createdCrossScope` counts (v1.4.0+)
- SuggestedLink interface extended with `isCrossScope`, `sourceMetadata`, `targetMetadata` fields
- hooks.json updated with PostToolUse:Task matcher for agent retrospectives
- .tddignore excludes `/commands` directory (documentation files)

### Performance
- Cross-scope auto-linking: Minimal overhead from metadata tracking
- Agent retrospective hook: <25ms, early exit if no agent detected
- --all-scopes: Efficient parallel cache loading

## [1.3.1] - 2026-02-16

### Fixed
- **CLI help text**: Updated `help.ts` to include agent-scoped memory features that were missing from compact/full help output
  - Added `agents` command to command list
  - Added agent-project and agent-global to SCOPE section
  - Added AGENT SCOPE FLAGS section documenting `--agent`, `--include-shared`, `--all-agents`, `--target-agent`
  - Added agent scope examples showing common agent-scoped operations
  - Updated CRUD, Graph, and Advanced command sections with agent-related flags
  - Help text now matches the comprehensive per-command documentation in `command-help.ts`
- **Version consistency**: Corrected version mismatch where SKILL.md and README.md showed 2.0.0 instead of 1.3.0

### Added
- **Cross-scope linking documentation**: Added dedicated CROSS-SCOPE LINKING section to help text
  - Documents all supported cross-scope combinations (local↔project↔global, agent↔project, agent↔agent)
  - Explains dual-graph storage mechanism (edges stored in BOTH graph files)
  - Provides cross-scope linking examples for common scenarios
  - Added warning about edge loss during bulk-move operations
  - Enhanced Graph Operations section with detailed cross-scope linking examples

## [1.3.0] - 2026-02-06

### Added

#### Agent-Scoped Memory Namespaces (US1, US2)
- **Agent memory isolation**: Agents maintain separate memory stores in `.claude/memory/agents/{name}/`
- **Dual agent scopes**: `agent-project` (shared with team via git) and `agent-global` (personal, in `~/.claude/memory/agents/{name}/`)
- **Scope hierarchy**: Agent-project → agent-global → project → global resolution order
- **Auto-directory creation**: Agent directories created automatically on first write
- **Agent name sanitisation**: Handles uppercase, spaces, special characters, and Unicode

#### CLI Agent Targeting (US3)
- **`--agent <name>` flag**: All CRUD commands accept agent targeting
- **`--include-shared` flag**: Include project/global memories in agent searches
- **`--all-agents` flag**: Apply operations across all agents
- **`--target-agent <name>` flag**: Cross-agent linking support
- **`memory agents` command**: List all registered agents with memory counts and type breakdowns
- **Updated help text**: All commands document agent flags

#### Multi-Scope Read Operations (US4)
- **`--include-shared` for search/semantic/list/query/stats/impact**: Read across agent + project + global scopes
- **Scope indicators**: Results annotated with `[agent-project]`, `[agent-global]`, `[project]`, `[global]`
- **Validation**: `--include-shared` rejected on write operations, requires `--agent`

#### Agent Graph Integration (US5)
- **Agent-scoped Mermaid diagrams**: `memory mermaid --agent` with distinct visual styling
- **Agent health checks**: `memory health --agent` validates agent scope integrity
- **Agent statistics**: `memory stats --agent` reports agent-specific metrics
- **Agent suggest-links**: Works within agent scope boundaries
- **`memory agents` command**: Scans directories, reports memory counts and types per agent

#### Context Injection Preparation (US6)
- **Hook interface placeholders**: Agent context parameter added to hook type definitions
- **Documentation**: Future agent context injection workflow documented

### Changed
- Scope enum extended with `AgentProject` and `AgentGlobal` values
- ScopeResolver accepts optional `agentName` parameter
- Frontmatter schema extended with optional `agent` field
- Index system handles agent scope directories
- Search operations support agent scope filtering

### Performance
- Agent-scoped CRUD: <100ms warm, <500ms cold start
- Cross-scope graph operations: <500ms
- Agent listing: <200ms for 10+ agents

### Migration
- No breaking changes — all existing commands work unchanged without `--agent`
- Existing memory files remain fully compatible
- Agent directories are only created when `--agent` is used

## [1.2.1] - 2026-02-01

### Fixed

#### Memory Embedding Generation
- **Embeddings now generated by default**: Fixed critical issue where 88% of memories (119/135) lacked embeddings
  - Embedding generation no longer requires `--auto-link` flag
  - Graceful fallback when Ollama is unavailable (no errors, just skips embedding)
  - Fast failure (2s timeout) instead of 30s hang when Ollama is unavailable
  - 93% faster failure detection improves write performance
- **Atomic cache writes**: Fixed potential cache corruption from concurrent memory writes
  - Changed from `fs.writeFileSync()` to `writeFileAtomic()` for embedding cache
  - Prevents data loss during concurrent operations
- **Missing embeddings detection**: `memory rebuild` now reports how many memories lack embeddings
  - Suggests running `memory refresh --embeddings` to backfill
  - Excludes temporary/thought memories from count (they're ephemeral)

### Added

#### Embedding Infrastructure
- **Health check function**: `createOllamaProviderWithHealthCheck()` validates Ollama availability before attempting generation
  - 2-second timeout prevents blocking
  - Checks both Ollama service and model availability
  - Returns `undefined` for graceful fallback instead of throwing
- **Improved error messages**: Semantic search now provides setup instructions when Ollama is unavailable
  - Includes installation link, setup steps, and troubleshooting guidance
- **Runtime API validation**: Ollama API responses are now validated before use
  - Prevents crashes from API changes
  - Gracefully handles malformed responses

### Changed

#### Code Quality Improvements
- **Comprehensive test coverage**: Added 14 new tests for health check function
  - Tests timeout handling, network errors, malformed responses
  - Tests model availability checking and prefix matching
  - Tests custom URLs and model names
- **Better documentation**: Added JSDoc explaining model prefix-matching strategy
  - Documents version flexibility trade-off
- **Named constants**: Extracted `OLLAMA_HEALTH_CHECK_TIMEOUT_MS` constant (was magic number `2000`)

### Migration

Existing memories without embeddings can be backfilled:
```bash
memory refresh --embeddings
```

No breaking changes - `--auto-link` flag still controls linking behaviour (not embedding generation).

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
