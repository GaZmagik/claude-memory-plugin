# Changelog

All notable changes to the Claude Memory Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.3] - 2026-03-07

### Fixed
- **Bug:** `memory suggest-links --all-scopes` threw `"The paths[0] property must be of type string, got object"` — missing `await` on `getScopePath()` in `suggest-links.ts`
- **Async cascade:** `findGitRoot` was made async but ~50 source files and ~40 test files were never updated to `await` the now-async `getScopePath()`, `getResolvedScopePath()`, `resolveAgentScopePath()`, and related functions — all scope-dependent CLI commands were affected
- **Bun compatibility:** replaced `vi.hoisted()` (unsupported in Bun) with top-level declarations in 5 spec files
- **Type safety:** typed `EdgeMetadata` and `LinkMemoriesRequest` scope fields as `Scope` enum instead of `string`, eliminating `as Scope` casts in `link.ts` and `edges.ts`
- **Type safety:** added `basePath` narrowing guards in `delete.ts`, `read.ts`, `search.ts`, `semantic-search.ts`
- **Type safety:** replaced string literals with `Scope`/`MemoryType` enum values across spec and source files
- **Code quality:** removed redundant `resolveScopePath` wrappers in `document.ts`, `thoughts.ts`, `conclude.ts` — inlined `getScopePath` directly
- **Code quality:** removed unnecessary `String()` calls before `as MemoryType` casts in `move.ts` and `reindex.ts`
- **Test pollution:** added `mock.restore()` cleanup to 11 spec files using `vi.mock()`, reducing cross-test pollution failures from 523 to 328
- **Fragility:** `suggest-links.ts` now passes `globalPath` instead of `''` to `getScopePath` calls

## [1.7.2] - 2026-03-01

### Fixed
- **Security:** removed redundant `tee` regex pattern and dead `isAllowedCommand` guard in directory protection
- **Performance:** `runCommand`/`execOrThrow` no longer falsely declared as `async` — accurately reflects synchronous `spawnSync` usage
- **Code quality:** removed always-true `toolName !== 'Read'` dead code branch in memory-context hook
- **Code quality:** resolved `isForkedSession` naming collision between `error-handler.ts` and `spawn-session.ts`
- **Code quality:** replaced `readdir` `as string[]` casts with explicit `encoding: 'utf-8'` parameter
- **Consistency:** added `node:` import prefix to all bare `path`/`os`/`fs`/`child_process` imports across 26 hook files
- **Documentation:** added fragility comment to `isForkedSession` documenting the `permission_mode` invariant

## [1.7.1] - 2026-02-25

### Added
- **Progress reporting for long-running CLI operations**: all batch operations now write live progress to stderr (keeps stdout JSON clean)
  - `memory refresh --embeddings`: shows per-memory collection progress and per-embedding generation progress with percentage, count, and elapsed time
  - `memory refresh --score-edges`: shows per-edge scoring progress with source→target labels
  - `memory sync`: shows phase-level progress across all 7 reconciliation phases
  - `memory repair`: shows progress for both sync and health-check phases
  - `memory audit` / `memory audit-quick`: shows per-memory scanning progress
  - `memory refresh` (frontmatter): shows per-file refresh progress
- **`cli/progress.ts`**: new `ProgressReporter` class and `MultiPhaseProgress` utility
  - TTY-aware: in-place carriage-return updates on terminals, newline fallback for piped output
  - Configurable throttling to avoid excessive stderr writes
  - Elapsed time display with human-readable formatting
  - `toCallback()` method for easy integration with existing `onProgress` callback patterns
- **`onProgress` callback support** added to `scoreEdges()`, `auditMemories()`, `syncMemories()`, and `refreshFrontmatter()`
  - `batchGenerateEmbeddings()` already had `onProgress` — now wired in from `cmdRefresh`

### Tests
- `cli/progress.spec.ts`: 19 unit tests covering `ProgressReporter` (rendering, throttling, completion, callbacks) and `MultiPhaseProgress` (phase transitions, completion)

## [1.7.0] - 2026-02-23

### Added
- **`memory refresh --score-edges`**: batch cosine similarity backfill for graph edges — computes similarity scores for edges created via `memory link` or `bulk-link` that previously had `similarity: undefined`
  - `--score-edges`: compute cosine similarity for all edges with available embeddings
  - `--verify`: LLM-suggest a relation label via Ollama → staged in `verifiedRelation` field
  - `--apply`: promote `verifiedRelation` → `edge.label` and clear the staging field
  - `--force`: re-score edges that already have a similarity value
  - `--dry-run`: preview counts without writing
  - Graph saved once after all mutations — not per-edge
- **`graph/score-edges.ts`**: `scoreEdges()` core function (new module)
- **`suggest/suggest-links.ts`**: exported `VALID_LABEL_RE` and `validateLlmLabel` for reuse

### Tests
- `graph/score-edges.spec.ts`: 13 unit tests (T1–T13) covering all flag combinations, dry-run, Ollama availability, and single-save behaviour
- `cli/commands/maintenance.spec.ts`: T14 CLI integration test for `--score-edges` flag delegation

## [1.6.3] - 2026-02-23

### Added
- **`SubagentRegistry`** (`hooks/src/agent/subagent-registry.ts`): per-subagent isolated temp files prevent concurrent agents from overwriting each other's capture entries
  - `writeSubagentEntry()`: writes a unique temp file per `(agentType, agentId)` pair
  - `findAndClaimSubagent()`: atomically claims the first unclaimed entry for a given agent type via `rename()` (POSIX-atomic on Linux)
  - `findAnyUnclaimedSubagent()`: claims any unclaimed entry regardless of type — used by `PostToolUse:Task` and `SessionEnd` sweep
  - `cleanupClaimedEntry()`: deletes the claimed marker file after successful processing to prevent `/tmp` accumulation
  - Input sanitisation strips path-unsafe characters and caps length to 64 chars to prevent `ENAMETOOLONG`
- **`SubagentStop` hook** (`hooks/subagent-stop/extract-agent-id.ts`): new `SubagentStop` event hook — registers each completed subagent in the registry immediately on exit

### Changed
- `agent-retrospective.ts`: replaced shared temp-file lookup with `findAnyUnclaimedSubagent()` — eliminates data loss when concurrent `Task` subagents complete simultaneously
- `memory-cleanup.ts`: sweeps all unclaimed subagent entries via `findAnyUnclaimedSubagent()` loop at session end — safety net for entries missed by `PostToolUse:Task`
- `hooks.json`: registered `SubagentStop` → `extract-agent-id.ts` hook (5 s timeout)

## [1.6.2] - 2026-02-23

### Security
- `suggest-links`: sanitise memory titles before LLM prompt interpolation — strip quotes and control characters, wrap in structural delimiters (CWE-77 / OWASP LLM01)
- `suggest-links`: validate `basePath` against the memory hierarchy before any I/O (CWE-22)
- `suggest-links`: replace `includes()` substring check with `startsWith()` prefix check in scope classification to prevent crafted-path spoofing (CWE-706)
- `suggest-links`: validate LLM-generated relation labels against an allowlist regex before storing as edge metadata — rejects multi-line, overlong, or malformed responses
- `suggest-links`: all auto-link `catch` blocks now write to `process.stderr` instead of silently swallowing errors
- `suggest-links`: capture `process.cwd()` once at function entry to prevent TOCTOU inconsistency (CWE-362)
- `suggest-links`: export `deriveScope` for direct unit testing

### Refactored
- `cli/command-help.ts` (902 lines) extracted into `cli/command-help/` directory — `types.ts`, `formatter.ts`, `index.ts`, and `entries/` subdirectory with one file per command group
- `maintenance/refresh-frontmatter.ts` (459 lines) extracted into `maintenance/refresh-frontmatter/` directory — `types.ts`, `think-migration.ts`, `project-detection.ts`, `embeddings.ts`, `index.ts`

### Tests
- `helpers.spec.ts`: replaced 14 vacuous `toBeDefined()` assertions on arrow function literals with real path assertions; added unit tests for `validateIncludeShared`, `scopeToIdentifier`, `getResolvedScopePath`, and `resolveSharedScopePaths`
- `suggest-links-security.spec.ts`: new cross-cutting security spec covering basePath validation, deriveScope prefix-check, LLM prompt injection, LLM response validation, and stderr error logging
- `suggest-links-llm.spec.ts`: LLM tests extracted from main spec into a dedicated file
- `formatter.spec.ts`: new unit tests for `formatDiscoveredList`
- `suggest-links-cross-scope.spec.ts`, `suggest-links-external.spec.ts`: updated to use valid memory hierarchy paths for M2 basePath validation compatibility

## [1.6.1] - 2026-02-23

### Changed
- `suggest-links`: removed deprecated `--include-shared` flag — use `--all-scopes` instead
- `suggest-links --all-scopes`: fixed global scope path resolution (was silently resolving to empty string, global scope never loaded)
- `suggest-links --all-scopes`: fixed agent directory scan path (`projectPath/agents` not `projectPath/.claude/agents`)
- `suggest-links --all-scopes`: removed redundant shadowed `globalPath` declaration inside try block
- `cmdStats`: added `nodes` alias to both single-scope and multi-scope response objects for consistency
- `cmdSummarize`: replaced fragile `void getResolvedScopePath(scope)` suppression with `void scope`

### Fixed
- `suggest-links` cross-scope test: `--include-shared` removal test now also asserts `result.status === 'success'`

## [1.6.0] - 2026-02-20

### Added

#### External File Indexing: Rule and Reminder Nodes (Feature 005)
- **Automatic discovery and indexing of external Claude configuration files** as read-only graph nodes
  - CLAUDE.md files (project root, .claude/, ancestor directories)
  - .claude/rules/*.md files (rules directory)
  - .claude/agent-memory/{agent}/MEMORY.md files (agent memory summaries)
  - .claude/agent-memory/{agent}/*.md files (agent sub-files like patterns.md, gotchas.md)
- **New memory types**: `MemoryType.Rule` and `MemoryType.Reminder` for external file classification
- **New edge types**: `EdgeType.GovernedBy` (decision → rule) and `EdgeType.RemindedBy` (gotcha/learning → reminder)
- **Read-only protection**: External nodes cannot be modified via write, delete, rename, move, or promote commands
  - Clear error messages guide users to edit source files and run `memory sync`
  - Read operations fully supported via `memory read` command
- **Content hash-based change detection**: Only regenerates embeddings for modified files during incremental updates
- **Deterministic ID generation**: Stable IDs based on file location, scope, and type
  - Rules: `rule-project-claude-md-root`, `rule-project-security`, `rule-global-api-design`
  - Reminders: `reminder-project-{agent}-memory`, `reminder-project-{agent}-patterns`
- **Mermaid visualisation enhancements**:
  - Rule nodes render as hexagons `{{}}` with distinct yellow styling
  - Reminder nodes render as subroutines `[[]]` with agent-specific styling
- **`memory index-context` command**: Fast incremental re-indexing of external files without full sync
  - Scope filtering: `--scope project|global`
  - Agent filtering: `--agent {name}`
  - Dry-run mode: `--dry-run`
  - Performance: <5s for typical projects vs full sync overhead
- **Semantic search integration**: External files participate in all search operations
  - `memory search` includes rule/reminder nodes in keyword results
  - `memory semantic` includes rule/reminder nodes in embedding-based results
  - `memory suggest-links` suggests connections between memories and external files
- **Quality audit exclusion**: Rule and reminder nodes automatically excluded from quality scoring
- **Graceful Ollama fallback**: External files indexed even when Ollama unavailable (embeddings skipped, keyword search still works)

#### External File Module
- New `skills/memory/src/external/` module with discovery and indexing logic:
  - `external-file-types.ts`: ExternalFileKind enum and ExternalFileEntry interface
  - `external-file-discovery.ts`: Tree-walking discovery with vendor filtering and symlink resolution
  - `external-file-indexer.ts`: Hash-based indexing with embedding generation and stale node removal
  - `index.ts`: Public API exports
- **Vendor directory filtering**: Excludes node_modules, .git, dist, build, .venv, etc.
- **Symlink resolution**: Follows symlinks with loop detection for safety

#### Integration
- `syncMemories()` now calls `indexExternalFiles()` as final pass
- Sync response includes `externalNodesAdded`, `externalNodesUpdated`, `externalNodesRemoved` counts
- Summary includes `externalRuleNodes` and `externalReminderNodes` counts

### Changed
- `IndexEntry` interface extended with optional `externalPath` and `externalFileKind` fields
- `cmdRead` now checks `externalPath` field and reads from source file for external nodes
- All mutating commands (write, delete, rename, move, promote) now guard against external node modification
- `parseMemoryType` extended to parse "rule" and "reminder" type strings
- Mermaid `NODE_SHAPES` and `NODE_STYLES` extended with rule (hexagon) and reminder (subroutine) entries
- Help text updated with `index-context` command documentation
- Version bumped to 1.6.0

### Performance
- **Discovery**: 10 files <500ms, 50 files <2s, 100 files <5s
- **Indexing** (excluding embeddings): 10 files <1s, 50 files <3s
- **Embedding generation** (Ollama): Single file ~200ms, batch of 10 ~2-3s
- **index-context**: Completes in <5s for typical projects (10 external files)

### Testing
- 48 integration tests covering all external file workflows (discovery, indexing, updates, deletion, linking, Mermaid rendering, suggest-links, performance)
- Comprehensive unit test coverage for guards, discovery, indexing, and command compatibility

## [1.5.1] - 2026-02-19

### Fixed
- **`memory update-edge` help text** — Added missing command-specific help entry in `command-help.ts`. Users running `memory help update-edge` or `memory update-edge --help` now receive comprehensive documentation including usage syntax, all flags (`--similarity`, `--relation`, `--verify`, `--apply`), cross-scope examples, and notes on Ollama integration for `--verify` flag.

### Documentation
- Clarified that `--verify` flag invokes Ollama to suggest better relation labels (previously undocumented in help text)
- Added 6 usage examples covering similarity updates, relation changes, verification workflow, and cross-scope edge updates

## [1.5.0] - 2026-02-18

### Added

#### Similarity on Edges (Feature 2)
- **`GraphEdge.similarity`** — optional `number` field (0–1) stored on edges created by `suggest-links --auto-link`
- `EdgeMetadata.similarity` validated and clamped in `addEdge()` — NaN rejected, out-of-range clamped to [0, 1]
- Duplicate edge detection unchanged: `(source, target, label)` identity; similarity is metadata only
- Backward compatible: existing edges without the field load cleanly

#### Edge Update Command (Feature 4)
- **`memory update-edge <sourceId> <targetId>`** — new CLI command to mutate metadata on existing edges without recreating them
- Flags: `--similarity <float>`, `--relation <label>`, `--verify`, `--apply`
- Cross-scope edges updated in both graph files (non-atomic dual-write, consistent with `storeCrossScopeEdge`)
- Implementation extracted to `skills/memory/src/graph/link-update.ts` (keeps `link.ts` under 600 lines)

#### LLM-Verified Link Types (Feature 3)
- **`suggest-links --auto-link --llm-type`** — uses Ollama to suggest a relation label before writing the edge; result stored as `verifiedRelation` on same-scope edges; cross-scope edges skipped
- **`update-edge --verify`** — invokes Ollama to suggest a more precise relation for an existing edge; stored as `verifiedRelation` (staging area)
- **`update-edge --apply`** — promotes `verifiedRelation` to `label` and removes the field entirely; leaves a clean edge with no dangling staging fields
- New `skills/memory/src/services/ollama.ts` — minimal Ollama client (`generate()`, `isAvailable()`, `configureClient()`); reads `chat_model` from `.claude/memory.local.md`; no dependency on `hooks/` package
- Graceful degradation: all LLM features degrade to no-op with stderr warning when Ollama is unavailable or times out
- Timeouts: `--llm-type` uses 300s, `--verify` uses 60s (accounts for cold-start model loading)

#### check-relevance Command (Feature 1)
- **`memory check-relevance [scope]`** — analyses scope placement of memories using four scoring functions (100pts total)
  - `scoreTypeMatch` (30pts): memory type appropriateness for scope
  - `scoreTagHeuristics` (25pts): tag-based scope signals
  - `scoreGraphConnectivity` (25pts): inbound/outbound edge ratio
  - `scoreContentAnalysis` (20pts): content keyword signals
- Confidence bands: High ≥80 (auto-move safe), Medium 60–79, Low 40–59, None <40
- Flags: `--threshold <n>`, `--type <type>`, `--agent <name>`, `--auto-move`, `--confirm`, `--dry-run`, `--format table|json|detailed`
- `--auto-move` requires `--confirm` guard (exits non-zero without it)

### Changed
- `suggest-links --auto-link` now stores cosine similarity score on created same-scope edges
- `SuggestLinksRequest` extended with `llmType?: boolean`
- `LinkMemoriesRequest` extended with `similarity?: number` and `verifiedRelation?: string`
- `UpdateEdgeRequest` / `UpdateEdgeResponse` types added to graph layer
- `--verify` help text updated: no longer annotated as "no-op until wired"
- Version bumped to 1.5.0

### Performance
- `check-relevance` scoring functions operate on index/graph data only — no file I/O in type/tag/connectivity scorers
- `ollama.generate()` timeout configurable per call-site, defaulting to 15s

## [1.4.1] - 2026-02-18

### Changed
- **curator agent**: Added `memory: project` frontmatter field — agent now loads project memory files, giving it access to the full project knowledge graph during health monitoring and graph integrity analysis
- **recall agent**: Added `memory: project` frontmatter field — agent now loads project memory files, enabling richer context during memory search, recall, and progressive deep-dive sessions

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
