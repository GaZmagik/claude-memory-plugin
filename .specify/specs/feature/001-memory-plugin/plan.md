# Implementation Plan: Claude Code Memory Plugin

**Feature**: 001-memory-plugin
**Branch**: `feature/001-memory-plugin`
**Created**: 2026-01-10
**Status**: Ready for Implementation

---

## Executive Summary

This plan outlines the implementation of a TypeScript-based Claude Code plugin that packages the existing memory skill system into a distributable, installable plugin. The implementation follows Test-Driven Development (TDD) principles and is structured in six independently deliverable phases aligned with user stories.

**Key Technologies**: TypeScript, Node.js, Ollama (optional), JSON, Markdown with YAML frontmatter

**Architecture Approach**: Plugin-first, skill-based, with graceful degradation for optional dependencies

---

## Technical Context

### Technology Stack

- **Runtime**: Node.js (bundled with Claude Code)
- **Language**: TypeScript (all skill logic, hooks, and utilities)
- **Embedding Provider**: Ollama (optional, graceful degradation to keyword search)
- **Storage**: JSON (graph.json, index.json), Markdown with YAML frontmatter (memory files)
- **Testing**: Jest or Vitest (TDD framework)
- **Build**: TypeScript compiler (tsc) or bundler (esbuild/tsx)

### Architecture Overview

**Plugin Structure** (per Claude Code plugin specification):
```
memory-plugin/
├── .claude-plugin/
│   └── plugin.json           # Plugin metadata (name, version, description)
├── skills/
│   └── memory/
│       ├── SKILL.md          # Skill definition and triggers
│       ├── src/              # TypeScript source
│       │   ├── core/         # CRUD operations (write, read, list, delete)
│       │   ├── graph/        # Graph operations (link, edges, visualisation)
│       │   ├── search/       # Semantic search and embedding cache
│       │   ├── quality/      # Health checks and quality scoring
│       │   ├── scope/        # 4-tier scope resolution logic
│       │   └── types/        # TypeScript interfaces and types
│       ├── lib/              # Compiled JavaScript (output)
│       └── package.json      # Skill dependencies
├── commands/
│   ├── check-memory-health.md
│   ├── check-gotchas.md
│   ├── memory-commit.md
│   └── memory.md
├── agents/
│   ├── memory-recall.md
│   └── memory-curator.md
├── hooks/
│   ├── hooks.json                    # Hook configuration (references all hooks)
│   ├── lib/                          # Shared hook utilities
│   │   └── error-handler.ts          # Common allow/block/error handling
│   ├── pre-tool-use/
│   │   └── protect-memory-directory.ts
│   ├── post-tool-use/
│   │   ├── memory-context.ts         # Gotcha injection for file reads
│   │   ├── memory-context-bash.ts    # Gotcha injection for bash commands
│   │   └── clear-memory-check-flag.ts
│   ├── user-prompt-submit/
│   │   ├── memory-skill-reminder.ts  # Suggest memory capture for edits
│   │   └── memory-think-reminder.ts  # Suggest memory think for decisions
│   ├── session-start/
│   │   └── start-memory-index.ts     # Inject memory summary
│   ├── session-end/
│   │   └── end-memory.ts             # Session cleanup
│   └── pre-compact/
│       └── pre-compact-memory.ts     # Preserve state before compaction
├── package.json              # Plugin dependencies
├── tsconfig.json             # TypeScript configuration
├── .gitignore
└── README.md                 # Plugin documentation
```

**4-Tier Scope Resolution** (enterprise → local → project → global):
1. **Enterprise**: Managed-settings defined path (opt-in, requires `scopes.enterprise.enabled: true` in config.json)
2. **Local**: `.claude/memory/local/` (gitignored, personal project-specific)
3. **Project**: `.claude/memory/` (shared via git)
4. **Global**: `~/.claude/memory/` (personal, cross-project)

**Embedding Provider Strategy**:
- Detect Ollama availability at configured endpoint (default: `http://localhost:11434`)
- Use configured model (default: `embeddinggemma`) with fallback models
- Graceful degradation to keyword search when unavailable
- Actionable error messages with setup instructions
- Cache embeddings in `.embedding-cache/` for performance

### Dependencies

**Required**:
- Node.js runtime (bundled with Claude Code)
- File system access (operating system)
- Claude Code plugin system

**Optional**:
- Ollama (for semantic search embeddings)
- Git (for project-scope memory sharing)
- managed-settings.json (for enterprise scope)

### Fork Session Architecture

**Critical Requirement**: Hooks that fork sessions (pre-compact, session-end) must prevent the forked session from auto-compacting.

**Problem**: When the main session is about to compact, hooks fork a new session to capture memories. If the forked session also has auto-compact enabled, it could compact before finishing the memory capture, creating a recursive compaction loop.

**Research Findings** (2026-01-10):
- `--no-auto-compact` CLI flag: **Not implemented** (open feature request [#6689](https://github.com/anthropics/claude-code/issues/6689))
- `~/.claude.json` config: Setting `autoCompactEnabled: false` works but affects all sessions
- `--settings` flag: **TESTED - DOES NOT WORK** for autoCompactEnabled override

**Solution Options** (in order of preference):

**Option 1: --settings flag override (BLOCKED - awaiting feature)**
```bash
claude --resume <session-id> --fork-session --settings '{"autoCompactEnabled": false}' -p "capture memories"
```
- Single installation required
- Per-invocation override
- Status: **TESTED 2026-01-10 - DOES NOT WORK** (--settings flag does not support autoCompactEnabled)
- Revisit when [#6689](https://github.com/anthropics/claude-code/issues/6689) is implemented

**Option 2: Dual installation (FALLBACK - proven)**
```
Primary Installation (claude):
  - autoCompactEnabled: true (default)
  - Used for normal development work

Secondary Installation (claude2):
  - ~/.claude.json with autoCompactEnabled: false
  - Used ONLY for forked memory capture sessions
  - Spawned via: claude2 --fork-session "capture memories"
```

**Option 3: Graceful degradation (LAST RESORT - manual workflow)**
```
If neither Option 1 nor Option 2 is available:
  - Disable automatic memory capture hooks (pre-compact, session-end)
  - Display warning at session start explaining limitations
  - Require users to run `/memory-commit` manually before compacting
  - Core memory operations (CRUD, search, graph) still work normally
```
- No forked sessions required
- Manual workflow only - user must remember to capture memories
- Warning message: "⚠️ Auto-capture disabled: No secondary Claude installation found. Run `/memory-commit` before compacting to preserve session context."

**Implementation Notes**:
- Option 1 confirmed non-functional (tested 2026-01-10) - skip until upstream fix
- Check for secondary installation (Option 2) first
- If no secondary installation, fall back to Option 3 (manual workflow)
- Detection logic in `start-memory-index.ts`:
  1. Check config for `fork.claudeBinary` setting
  2. If set to `disabled`, use Option 3 (manual workflow)
  3. If set to specific binary, verify it exists via `which <binary>`
  4. If not set, check for `claude2` binary availability
  5. Set session flag `memoryAutoCapture: true|false` based on result
- Config option: `fork.claudeBinary` (default: `claude2`, options: `claude2`, `disabled`)
- Document Options 2 and 3 in README.md with setup instructions
- TODO: Re-evaluate Option 1 when [#6689](https://github.com/anthropics/claude-code/issues/6689) is resolved

**Why this matters**:
- Without this, memory capture hooks would fail silently or cause infinite loops
- The bash implementation uses Option 2 successfully
- Option 1 would simplify installation significantly if it works
- Option 3 ensures the plugin works even without fork capability (just with reduced automation)

---

## Constitution Check

| Article | Status | Notes |
|---------|--------|-------|
| **P1: Plugin Architecture Compliance** | ✅ Pass | Follows official structure: `.claude-plugin/plugin.json` at root, components at plugin level |
| **P2: Test-First Development** | ✅ Pass | All phases include test tasks BEFORE implementation tasks. TDD enforced throughout. |
| **P3: GitHub Flow Discipline** | ✅ Pass | Feature branch `feature/001-memory-plugin` from main. PR required for merge. |
| **P4: Observability & Debuggability** | ✅ Pass | JSON output formats, actionable errors, session logging planned |
| **P5: Simplicity & YAGNI** | ✅ Pass | Solving concrete problems from spec. No speculative features. MCP deferred. |
| **P6: Semantic Versioning** | ✅ Pass | Version 1.0.0 in plugin.json. CHANGELOG.md planned. |

**No constitutional violations**. All design decisions align with established principles.

---

## Phase 0: Research & Setup

**Duration**: 1-2 days
**Dependencies**: None
**Deliverables**: research.md, TypeScript project scaffolding, test framework setup

### Research Tasks

See [research.md](./research.md) for detailed findings.

**Key Decisions**:

1. **TypeScript Build Strategy**: Use `tsx` for development (direct TS execution), `tsc` for production builds
   - **Rationale**: Faster iteration during development, optimised output for distribution

2. **Test Framework**: Use Vitest (fast, TypeScript-native, Jest-compatible API)
   - **Rationale**: Better TypeScript support than Jest, faster execution, modern tooling

3. **Embedding Provider**: Ollama with graceful degradation, configurable models
   - **Rationale**: Local-first, privacy-preserving, no external API costs

4. **Graph Storage**: Adjacency list in graph.json (Map<string, Edge[]>)
   - **Rationale**: Simple, efficient for single-node operations, human-readable

5. **Scope Resolution**: Waterfall check (enterprise → local → project → global)
   - **Rationale**: Most specific scope takes precedence, predictable behaviour

---

## Phase 1: Core CRUD Operations (US1 - Priority P1)

**Duration**: 3-5 days
**Dependencies**: Phase 0
**User Story**: Store and Retrieve Memories
**Deliverables**: Functional CRUD operations, index cache, slug generation

### Acceptance Criteria

- REQ-001: Memory creation with YAML frontmatter
- REQ-002: Support for 6 memory types (decision, learning, artifact, gotcha, breadcrumb, hub)
- REQ-003: Retrieval by slug
- REQ-004: Listing with filters (type, tags, scope)
- REQ-005: Keyword search
- REQ-006: Deletion with graph cleanup
- REQ-007: Automatic slug generation
- REQ-008: Index cache maintenance

### Implementation Outline

**Phase 1A: Foundation**
- TypeScript interfaces for Memory, Index, Frontmatter (src/types/)
- File system utilities (read, write, delete markdown files)
- YAML frontmatter parser and serialiser
- Slug generation with collision detection

**Phase 1B: CRUD Operations**
- `memory write` - Create memory with type, tags, content
- `memory read` - Retrieve memory by slug
- `memory list` - List memories with filters
- `memory search` - Keyword search in title/content
- `memory delete` - Remove memory and update index

**Phase 1C: Index Management**
- Index.json structure and schema
- Index update on CRUD operations
- Index rebuild from filesystem
- Index validation and repair

**Key Files**:
- `skills/memory/src/core/write.ts`
- `skills/memory/src/core/read.ts`
- `skills/memory/src/core/list.ts`
- `skills/memory/src/core/delete.ts`
- `skills/memory/src/core/index.ts`
- `skills/memory/src/core/slug.ts`

---

## Phase 2: 4-Tier Scope Resolution (US6 - Priority P1)

**Duration**: 2-3 days
**Dependencies**: Phase 1
**User Story**: 4-Tier Scope Resolution
**Deliverables**: Multi-scope storage, gitignore automation, config-driven enterprise scope

### Acceptance Criteria

- REQ-009: Global scope storage (~/.claude/memory/)
- REQ-010: Project scope storage (.claude/memory/)
- REQ-011: Local scope storage (.claude/memory/local/, gitignored)
- REQ-012: Enterprise scope storage (managed-settings path)
- REQ-013: Enterprise disabled by default
- REQ-014: Scope hierarchy resolution
- REQ-015: Intelligent default scope selection
- REQ-016: Automatic gitignore for local scope

### Implementation Outline

**Phase 2A: Scope Detection**
- Detect git repository presence
- Read config.json for scope preferences
- Read managed-settings.json for enterprise path
- Resolve scope hierarchy (enterprise → local → project → global)

**Phase 2B: Scope-Aware CRUD**
- Refactor CRUD operations to accept scope parameter
- Implement default scope logic (git repo → project, else → global)
- Merge results from multiple scopes on list/search
- Add scope indicators to output ([global], [project], [local], [enterprise])

**Phase 2C: Gitignore Automation**
- Detect .gitignore presence
- Add `.claude/memory/local/` to .gitignore
- Avoid duplicates, create .gitignore if missing

**Key Files**:
- `skills/memory/src/scope/resolver.ts`
- `skills/memory/src/scope/config.ts`
- `skills/memory/src/scope/gitignore.ts`

---

## Phase 3: Semantic Search & Embeddings (US2 - Priority P2)

**Duration**: 3-4 days
**Dependencies**: Phase 1, Phase 2
**User Story**: Semantic Search with Embeddings
**Deliverables**: Ollama integration, embedding cache, semantic search

### Acceptance Criteria

- REQ-017: Embedding model detection
- REQ-018: Graceful degradation with actionable errors
- REQ-019: Configurable embedding models via config.json
- REQ-020: Embedding cache (.embedding-cache/)
- REQ-021: Semantic search accuracy (cosine similarity)
- REQ-022: Global and project-level config support
- REQ-023: Offline operation (fallback to keyword search)

### Implementation Outline

**Phase 3A: Ollama Integration**
- Detect Ollama availability (HTTP check to localhost:11434)
- Read embedding config from config.json (model, endpoint, fallbacks)
- Generate embeddings via Ollama API
- Handle errors with actionable messages (install/pull/start instructions)

**Phase 3B: Embedding Cache**
- Cache structure: `.embedding-cache/<slug>.json` → `{ model, vector, timestamp }`
- Compute embeddings on memory write
- Invalidate cache on content changes
- Clean up stale cache entries

**Phase 3C: Semantic Search**
- `memory semantic <query>` - Compute query embedding
- Calculate cosine similarity against all cached embeddings
- Rank results by similarity score
- Filter low-relevance results (threshold: 0.3)
- Fall back to keyword search if Ollama unavailable

**Key Files**:
- `skills/memory/src/search/ollama.ts`
- `skills/memory/src/search/embeddings.ts`
- `skills/memory/src/search/semantic.ts`
- `skills/memory/src/search/similarity.ts`

---

## Phase 4: Graph Operations (US3 - Priority P2)

**Duration**: 3-4 days
**Dependencies**: Phase 1, Phase 2
**User Story**: Graph-Based Memory Linking
**Deliverables**: Bidirectional linking, graph visualisation, AI-powered suggestions

### Acceptance Criteria

- REQ-024: Bidirectional link creation with labels
- REQ-025: Edge listing for memories
- REQ-026: Graph visualisation (Mermaid diagrams)
- REQ-027: Link cleanup on deletion
- REQ-028: AI-powered link suggestions (optional)
- REQ-029: Graph data structure (adjacency list)

### Implementation Outline

**Phase 4A: Graph Structure**
- graph.json schema: `{ [memoryId]: Edge[] }` where Edge = `{ target, label, timestamp }`
- Graph CRUD: add edge, remove edge, list edges
- Bidirectional consistency (forward and reverse edges)

**Phase 4B: Link Operations**
- `memory link <source> <target> --label <label>` - Create bidirectional edge
- `memory unlink <source> <target>` - Remove bidirectional edge
- `memory edges <slug>` - List all connections for a memory
- Update memory frontmatter with link references

**Phase 4C: Visualisation**
- `memory graph <slug> [--depth 2]` - Generate Mermaid diagram
- Traverse graph to depth N from starting node
- Format as Mermaid flowchart syntax
- Include edge labels in diagram

**Phase 4D: Link Suggestions (Optional)**
- Use semantic similarity to suggest related memories
- Propose link labels based on content analysis
- Rank suggestions by confidence score

**Key Files**:
- `skills/memory/src/graph/structure.ts`
- `skills/memory/src/graph/link.ts`
- `skills/memory/src/graph/visualise.ts`
- `skills/memory/src/graph/suggest.ts`

---

## Phase 5: Hooks & Contextual Injection (US4 - Priority P3)

**Duration**: 4-5 days
**Dependencies**: Phase 1, Phase 2, Phase 3
**User Story**: Contextual Gotcha Injection
**Deliverables**: 9 hooks, session deduplication, performance optimisation

### Acceptance Criteria

- REQ-030: File pattern matching for gotcha injection
- REQ-031: Session-based deduplication
- REQ-032: Relevance prioritisation (top 3)
- REQ-033: No injection when irrelevant
- REQ-034: Bash context injection
- REQ-035: Performance <50ms latency

### Implementation Outline

**Phase 5A: Core Hooks**
- `protect-memory-directory.ts` (PreToolUse) - Block Write/Edit to .claude/memory/
- `memory-context.ts` (PostToolUse) - Inject gotchas when reading files
- `memory-context-bash.ts` (PostToolUse) - Inject gotchas for Bash commands
- `start-memory-index.ts` (SessionStart) - Inject memory summary

**Phase 5B: Context Awareness**
- Tag-based matching (file path → tags → gotchas)
- Semantic matching (file content → embeddings → similar gotchas)
- Relevance scoring (tag overlap + semantic similarity)
- Top-N selection (limit to 3 gotchas per file)

**Phase 5C: Session Management**
- Track shown gotchas in session state
- Deduplicate within session (don't repeat same gotcha)
- Clear session state on SessionEnd
- `clear-memory-check-flag.ts` (PostToolUse) - State cleanup

**Phase 5D: Additional Hooks**
- `memory-skill-reminder.ts` (UserPromptSubmit) - Suggest memory capture for edits
- `memory-think-reminder.ts` (UserPromptSubmit) - Suggest `memory think` for decisions
- `pre-compact-memory.ts` (PreCompact) - Preserve memory state
- `end-memory.ts` (SessionEnd) - Finalisation and cleanup

**Key Files**:
- `hooks/lib/error-handler.ts` (shared utilities)
- `hooks/pre-tool-use/protect-memory-directory.ts`
- `hooks/post-tool-use/memory-context.ts`
- `hooks/post-tool-use/memory-context-bash.ts`
- `hooks/post-tool-use/clear-memory-check-flag.ts`
- `hooks/user-prompt-submit/memory-skill-reminder.ts`
- `hooks/user-prompt-submit/memory-think-reminder.ts`
- `hooks/session-start/start-memory-index.ts`
- `hooks/session-end/end-memory.ts`
- `hooks/pre-compact/pre-compact-memory.ts`
- `hooks/hooks.json` (configuration)

---

## Phase 6: Health, Quality & Commands (US5 - Priority P3)

**Duration**: 3-4 days
**Dependencies**: Phase 1-4
**User Story**: Health Monitoring and Quality Scoring
**Deliverables**: Health checks, quality scoring, slash commands, agents

### Acceptance Criteria

- REQ-036: Health report generation
- REQ-037: Orphan detection
- REQ-038: Broken link detection
- REQ-039: Frontmatter validation
- REQ-040: Quality scoring (0-100)
- REQ-041: Automated repair
- REQ-042: Embedding cache health

### Implementation Outline

**Phase 6A: Health Checks**
- `/check-memory-health` command
- Validate graph.json structure
- Detect broken links (edges to deleted memories)
- Detect orphan memories (no hub links)
- Validate YAML frontmatter in all memory files
- Check embedding cache consistency

**Phase 6B: Quality Scoring**
- `memory quality <slug>` - Score 0-100
- Completeness: Has tags, type, links, sufficient content
- Linking: Connected to hubs, has meaningful edges
- Content quality: Length, formatting, clarity
- Provide improvement suggestions

**Phase 6C: Automated Repair**
- `memory repair` - Fix broken links, rebuild index
- Remove edges to deleted memories
- Regenerate missing index entries
- Clean up stale embedding cache
- Report unfixable issues

**Phase 6D: Slash Commands**
- `/check-memory-health` - Full health report
- `/check-gotchas` - Check work against documented gotchas
- `/memory-commit` - Capture memories from conversation context
  - **Auto-generate hubs**: If memories are captured for a feature branch, auto-create feature hub if not exists
  - Detect branch pattern (e.g., `feature/001-memory-plugin`) and create `artifact-feature-001-hub`
  - Link captured memories to the hub automatically
  - This replaces session-start/session-end hub generation (command is more reliable than hooks)
- `/memory` - Quick access to common operations

**Phase 6E: Agents**
- `memory-recall.md` - Efficient memory search specialist
- `memory-curator.md` - Health monitoring and curation

**Key Files**:
- `skills/memory/src/quality/health.ts`
- `skills/memory/src/quality/scoring.ts`
- `skills/memory/src/quality/repair.ts`
- `commands/check-memory-health.md`
- `commands/check-gotchas.md`
- `commands/memory-commit.md`
- `commands/memory.md`
- `agents/memory-recall.md`
- `agents/memory-curator.md`

---

## Phase 7: Plugin Packaging & Distribution

**Duration**: 2-3 days
**Dependencies**: Phase 1-6
**Deliverables**: plugin.json, README.md, installation testing, backward compatibility validation

### Acceptance Criteria

- REQ-043: Plugin installation via `/plugin install`
- REQ-044: Backward compatibility with bash-created memories
- REQ-049: Plugin structure compliance

### Implementation Outline

**Phase 7A: Plugin Metadata**
- `.claude-plugin/plugin.json` with name, version, description, author
- package.json with dependencies and build scripts
- tsconfig.json for TypeScript compilation
- .gitignore for node_modules, lib/, .embedding-cache/

**Phase 7B: Documentation**
- README.md with installation, usage, configuration
- Document all slash commands and agents
- Provide embedding setup instructions
- Document 4-tier scope system
- Include troubleshooting section

**Phase 7C: Backward Compatibility Testing**
- Test with existing ~/.claude/memory/ files
- Verify YAML frontmatter compatibility
- Verify graph.json and index.json compatibility
- No migration required

**Phase 7D: Installation Testing**
- Test `/plugin install <git-url>`
- Test all components load correctly
- Test hooks register properly
- Performance validation (<30s installation)

**Key Files**:
- `.claude-plugin/plugin.json`
- `README.md`
- `package.json`
- `tsconfig.json`
- `.gitignore`

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Breaking changes to memory file format** | High | Low | Maintain exact YAML frontmatter compatibility. Extensive backward compat tests. |
| **Performance regression vs bash** | Medium | Medium | Benchmark CRUD operations. Cache aggressively. Optimise hot paths. |
| **Ollama unavailable on user systems** | Low | High | Graceful degradation to keyword search. Clear setup instructions. |
| **Enterprise path inaccessible** | Medium | Low | Skip enterprise scope with warning. Continue with other scopes. |
| **Hook execution timeout** | Medium | Medium | Optimise gotcha matching. Use indexed lookups. Set reasonable timeouts. |
| **TypeScript build complexity** | Low | Low | Use simple tsc build. Provide pre-built lib/ in distribution. |
| **Plugin size too large** | Low | Low | Exclude unnecessary dependencies. Use tree-shaking. |
| **Concurrent write conflicts** | Medium | Low | Implement file locking or last-write-wins with timestamps. |

---

## Success Metrics

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| **SC-001**: Backward compatibility | 100% existing memories readable | Integration test with bash-created memories |
| **SC-002**: CRUD performance | <100ms file ops, <500ms graph ops | Performance benchmark suite |
| **SC-003**: Semantic search accuracy | 80%+ relevant in top 5 | Test query set with ground truth |
| **SC-004**: Health check coverage | 100% orphans and broken links found | Synthetic test data with known issues |
| **SC-005**: Plugin installation time | <30 seconds | Timed installation on clean system |
| **SC-006**: Gotcha injection latency | <50ms added to file reads | Hook performance monitoring |
| **SC-007**: Scope isolation | No cross-scope leakage | Scope isolation test suite |
| **SC-008**: Offline operation | Full functionality except semantic search | Network-disabled test environment |

---

## Implementation Sequence

**Priority P1 (Must-Have)**:
1. Phase 0: Research & Setup (1-2 days)
2. Phase 1: Core CRUD (3-5 days)
3. Phase 2: Scope Resolution (2-3 days)

**Priority P2 (High-Value)**:
4. Phase 3: Semantic Search (3-4 days)
5. Phase 4: Graph Operations (3-4 days)

**Priority P3 (Nice-to-Have)**:
6. Phase 5: Hooks & Injection (4-5 days)
7. Phase 6: Health & Quality (3-4 days)

**Final Packaging**:
8. Phase 7: Plugin Distribution (2-3 days)

**Total Estimated Duration**: 21-34 days (individual contributor, full-time)

---

## Next Steps

1. **Approval Gate**: Review this plan with stakeholders (if applicable)
2. **Task Breakdown**: Generate detailed task list with `/speckit.tasks`
3. **TDD Workflow**: Begin Phase 0 with test scaffolding
4. **Incremental Delivery**: Complete each phase before moving to next
5. **Continuous Validation**: Test against success criteria throughout

---

**Plan Version**: 1.0.0
**Author**: Speckit Planner Agent
**Last Updated**: 2026-01-10
**Ready for**: Task Generation (`/speckit.tasks`)
