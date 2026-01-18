---
user_stories:
  - id: "US1"
    title: "Store and Retrieve Memories"
    priority: "P1"
    independently_testable: true
  - id: "US2"
    title: "Semantic Search with Embeddings"
    priority: "P2"
    independently_testable: true
  - id: "US3"
    title: "Graph-Based Memory Linking"
    priority: "P2"
    independently_testable: true
  - id: "US4"
    title: "Contextual Gotcha Injection"
    priority: "P3"
    independently_testable: true
  - id: "US5"
    title: "Health Monitoring and Quality Scoring"
    priority: "P3"
    independently_testable: true
  - id: "US6"
    title: "4-Tier Scope Resolution"
    priority: "P1"
    independently_testable: true
---

# Feature Specification: Claude Code Memory Plugin

**Feature Branch**: `feature/001-memory-plugin`
**Created**: 2026-01-10
**Status**: Approved (Gate 1 Passed)
**Input**: Exploration document from `/speckit.explore`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Store and Retrieve Memories (Priority: P1)

As a Claude Code user, I want to store knowledge (decisions, learnings, gotchas, artifacts) during my sessions so that I can retrieve them in future sessions without losing context.

**Why this priority**: This is the core functionality. Without CRUD operations, nothing else works. Every other feature depends on being able to write and read memories.

**Independent Test**: Can be fully tested by writing a memory with `memory write`, reading it back with `memory read`, listing with `memory list`, and deleting with `memory delete`. Delivers immediate value as persistent knowledge storage.

**Acceptance Scenarios**:

1. **Given** no existing memories, **When** I run `memory write "API uses OAuth2" --type decision --tags auth,api`, **Then** a markdown file is created with YAML frontmatter containing type, tags, and timestamp
2. **Given** an existing memory "decision-oauth2.md", **When** I run `memory read decision-oauth2`, **Then** the full memory content is displayed
3. **Given** multiple memories exist, **When** I run `memory list --type decision`, **Then** all decision-type memories are listed with their titles and dates
4. **Given** a memory exists, **When** I run `memory delete decision-oauth2`, **Then** the memory file is removed and graph references are cleaned up
5. **Given** memories exist, **When** I run `memory search "authentication"`, **Then** memories containing "authentication" in title or content are returned

---

### User Story 6 - 4-Tier Scope Resolution (Priority: P1)

As a Claude Code user working across multiple projects, I want memories to be stored at appropriate scope levels (global, project, local, enterprise) so that I can share team knowledge whilst keeping personal notes private.

**Why this priority**: Scope resolution is foundational - it determines where memories are stored and retrieved from. Must be implemented alongside US1 as it affects all CRUD operations.

**Independent Test**: Can be tested by creating memories at different scopes and verifying they appear in the correct directories and are retrieved appropriately.

**Acceptance Scenarios**:

1. **Given** I'm in a project directory, **When** I run `memory write "Note" --scope global`, **Then** the memory is stored in `~/.claude/memory/`
2. **Given** I'm in a project directory, **When** I run `memory write "Note" --scope project`, **Then** the memory is stored in `.claude/memory/`
3. **Given** I'm in a project directory, **When** I run `memory write "Note" --scope local`, **Then** the memory is stored in `.claude/memory/local/` and `.claude/memory/local/` is gitignored
4. **Given** enterprise is enabled in config.json (`scopes.enterprise.enabled: true`) AND managed-settings.json sets `CLAUDE_MEMORY_ENTERPRISE_PATH` environment variable, **When** I run `memory write "Note" --scope enterprise`, **Then** the memory is stored at the enterprise-defined path
5. **Given** enterprise is NOT enabled in config.json (default), **When** I run `memory write "Note" --scope enterprise`, **Then** an error is returned explaining enterprise scope is disabled and how to enable it
6. **Given** no scope specified, **When** I run `memory write "Note"`, **Then** the default scope is used (global for personal, project for team context)
7. **Given** memories exist at multiple scopes, **When** I run `memory list`, **Then** memories from all accessible scopes are merged with scope indicators

---

### User Story 2 - Semantic Search with Embeddings (Priority: P2)

As a Claude Code user with many memories, I want to search by meaning rather than exact keywords so that I can find relevant memories even when I don't remember the exact wording.

**Why this priority**: Semantic search significantly improves memory retrieval quality but requires embedding infrastructure. Core CRUD must work first.

**Independent Test**: Can be tested by creating memories about related topics with different wording, then searching semantically to verify conceptually related memories are returned.

**Acceptance Scenarios**:

1. **Given** Ollama is running with embeddinggemma, **When** I run `memory semantic "authentication problems"`, **Then** memories about OAuth, login issues, and auth errors are returned even if they don't contain "authentication"
2. **Given** Ollama is not running, **When** I run `memory semantic "query"`, **Then** an actionable error is displayed with setup instructions and the system falls back to keyword search (see Embedding Degradation Matrix below)
3. **Given** config.json specifies `embedding.model: nomic-embed-text`, **When** semantic search runs, **Then** the configured model is used instead of the default
4. **Given** a memory is created, **When** the memory is saved, **Then** its embedding is computed and cached in `.embedding-cache/`
5. **Given** cached embeddings exist, **When** semantic search runs, **Then** cached embeddings are used without recomputation

---

### User Story 3 - Graph-Based Memory Linking (Priority: P2)

As a Claude Code user, I want to link related memories together so that I can navigate between connected concepts and understand relationships.

**Why this priority**: Graph linking adds significant value for knowledge discovery but requires core CRUD and is more complex than basic operations.

**Independent Test**: Can be tested by creating memories, linking them, and verifying navigation between linked memories works correctly.

**Acceptance Scenarios**:

1. **Given** two memories exist, **When** I run `memory link decision-oauth2 learning-token-refresh --label "implements"`, **Then** a bidirectional edge is created in graph.json
2. **Given** linked memories exist, **When** I run `memory edges decision-oauth2`, **Then** all connected memories are listed with their relationship labels
3. **Given** a hub memory exists, **When** I run `memory graph auth-hub`, **Then** a Mermaid diagram showing the hub and all connected memories is generated
4. **Given** memories are linked, **When** I delete a memory, **Then** all edges referencing that memory are removed from graph.json
5. **Given** memories exist, **When** I run `memory suggest-links`, **Then** AI-powered link suggestions are returned based on content similarity

---

### User Story 4 - Contextual Gotcha Injection (Priority: P3)

As a Claude Code user, I want to automatically receive relevant warnings and gotchas when I'm working with code files so that I don't repeat past mistakes.

**Why this priority**: This is a quality-of-life feature that builds on semantic search. Requires hooks infrastructure and is less critical than core operations.

**Independent Test**: Can be tested by creating gotcha memories for specific file patterns, then reading those files and verifying gotcha warnings appear.

**Acceptance Scenarios**:

1. **Given** a gotcha memory exists tagged with "auth", **When** Claude reads a file in `src/auth/`, **Then** the gotcha is displayed as a warning in the tool output
2. **Given** a gotcha was already shown this session, **When** Claude reads another auth file, **Then** the same gotcha is NOT repeated (session deduplication)
3. **Given** no relevant gotchas exist, **When** Claude reads a file, **Then** no gotcha warnings are injected
4. **Given** multiple gotchas match, **When** Claude reads a file, **Then** gotchas are prioritised by relevance score and limited to top 3

---

### User Story 5 - Health Monitoring and Quality Scoring (Priority: P3)

As a Claude Code user, I want to monitor the health of my memory system and identify quality issues so that I can maintain a clean and useful knowledge base.

**Why this priority**: Health monitoring is a maintenance feature. Core functionality must exist before we can assess its health.

**Independent Test**: Can be tested by creating memories with various quality issues (orphans, missing frontmatter, broken links) and verifying the health check identifies them.

**Acceptance Scenarios**:

1. **Given** memories exist, **When** I run `/check-memory-health`, **Then** a health report is generated showing: total memories, orphan count, broken links, frontmatter issues
2. **Given** orphan memories exist (not linked to any hub), **When** health check runs, **Then** orphans are identified with suggestions to link them
3. **Given** memories have broken links (referencing deleted memories), **When** health check runs, **Then** broken links are identified with fix options
4. **Given** memories exist, **When** I run `memory quality decision-oauth2`, **Then** a quality score (0-100) is returned with improvement suggestions
5. **Given** health issues are identified, **When** I run `memory repair`, **Then** fixable issues (broken links, missing index entries) are automatically resolved

---

### Edge Cases

- What happens when a memory file exists but isn't in the index? → Auto-rebuild index entry on access
- What happens when graph.json is corrupted? → Validate and repair, or rebuild from memory file links
- What happens when Ollama is available but the configured model isn't pulled? → Auto-detect available models, suggest pull command
- What happens when enterprise path is configured but inaccessible? → Skip enterprise scope with warning, continue with other scopes
- What happens when two memories have the same slug? → Append numeric suffix (decision-oauth2-1.md)
- What happens during concurrent writes to the same memory? → Last-write-wins with timestamp, or lock file

## Requirements *(mandatory)*

### Functional Requirements

**Core CRUD (US1)**:
- **FR-001**: System MUST store memories as markdown files with YAML frontmatter
- **FR-002**: System MUST support memory types: decision, learning, artifact, gotcha, breadcrumb, hub
- **FR-003**: System MUST maintain an index.json cache for fast lookups
- **FR-004**: System MUST support tags for categorisation
- **FR-005**: System MUST auto-generate slugs from memory titles

**Scope Resolution (US6)**:
- **FR-006**: System MUST resolve scope hierarchy: enterprise → local → project → global
- **FR-007**: System MUST create `.claude/memory/local/` and add to .gitignore automatically
- **FR-008**: Enterprise scope MUST be disabled by default
- **FR-009**: Enterprise scope MUST be enabled via config.json setting `scopes.enterprise.enabled: true`
- **FR-010**: When enterprise enabled, System MUST detect enterprise path from managed-settings.json environment variable (`CLAUDE_MEMORY_ENTERPRISE_PATH`)
- **FR-011**: System MUST merge memories from all accessible scopes on list/search operations

**Semantic Search (US2)**:
- **FR-012**: System MUST detect Ollama availability before semantic operations
- **FR-013**: System MUST provide actionable error messages when Ollama unavailable
- **FR-014**: System MUST cache embeddings in `.embedding-cache/` for performance
- **FR-015**: System MUST support configurable embedding models via config.json
- **FR-016**: System MUST fall back to keyword search when embeddings unavailable

**Graph Operations (US3)**:
- **FR-017**: System MUST store graph as adjacency list in graph.json
- **FR-018**: System MUST support labelled, bidirectional edges
- **FR-019**: System MUST clean up edges when memories are deleted
- **FR-020**: System MUST generate Mermaid diagrams for graph visualisation

**Slash Commands**:
- **FR-021**: Plugin MUST provide `/memory:check-health` command for system health validation
- **FR-022**: Plugin MUST provide `/memory:check-gotchas` command to check work against documented gotchas
- **FR-023**: Plugin MUST provide `/memory:commit` command to capture memories from conversation context
- ~~**FR-024**: Plugin MUST provide `/memory` command for quick access to common memory operations~~ REMOVED: Superseded by `memory` CLI

**Agents**:
- **FR-025**: Plugin MUST provide `memory:recall` agent for efficient memory search with resumable sessions
- **FR-026**: Plugin MUST provide `memory:curator` agent for health monitoring, orphan detection, and quality assurance

**Hooks (US4)**:
- **FR-027**: `protect-memory-directory.ts` (PreToolUse) - Block direct Write/Edit/MultiEdit to .claude/memory/
- **FR-028**: `memory-context.ts` (PostToolUse) - Inject relevant gotchas when reading code files
- **FR-029**: `memory-context-bash.ts` (PostToolUse) - Bash-specific memory context injection
- **FR-030**: `start-memory-index.ts` (SessionStart) - Inject memory index summary at session start
- **FR-031**: `memory-skill-reminder.ts` (UserPromptSubmit) - Suggest memory capture for significant edits
- **FR-032**: `memory-think-reminder.ts` (UserPromptSubmit) - Suggest `memory think` for complex decisions
- **FR-033**: `clear-memory-check-flag.ts` (PostToolUse) - Session cleanup for memory check state
- **FR-034**: `pre-compact-memory.ts` (PreCompact) - Preserve memory state before compaction
- **FR-035**: `end-memory.ts` (SessionEnd) - Session cleanup and finalisation
- **FR-036**: System MUST deduplicate gotcha injections within a session (no repeated warnings)

**Health & Quality (US5)**:
- **FR-037**: System MUST detect orphan memories (no hub links)
- **FR-038**: System MUST detect broken links in graph.json
- **FR-039**: System MUST validate YAML frontmatter structure
- **FR-040**: System MUST provide quality scores based on completeness and linking

**Plugin Structure**:
- **FR-041**: Plugin MUST follow Claude Code plugin structure (.claude-plugin/plugin.json at root)
- **FR-042**: Plugin MUST be installable via `/plugin install` from git URL
- **FR-043**: Plugin MUST work with existing ~/.claude/memory/ files without migration

### Key Entities

- **Memory**: A markdown file with YAML frontmatter (type, tags, links, created, updated)
- **Graph**: Adjacency list in graph.json mapping memory IDs to edges with labels
- **Index**: Cached metadata in index.json for fast queries
- **Scope**: One of global, project, local, enterprise - determines storage location
- **Hub**: Special memory type that serves as a navigation node linking related memories
- **Embedding**: Vector representation of memory content for semantic search

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing bash-created memories in ~/.claude/memory/ are readable by the plugin without modification
- **SC-002**: Memory CRUD operations complete in <100ms for files, <500ms for graph updates
- **SC-003**: Semantic search returns relevant results within top 5 for 80%+ of test queries
- **SC-004**: Health check identifies 100% of orphan memories and broken links
- **SC-005**: Plugin installs successfully via `/plugin install <git-url>` in under 30 seconds
- **SC-006**: Gotcha injection adds <50ms latency to file read operations
- **SC-007**: 4-tier scope resolution correctly isolates memories (no cross-scope leakage)
- **SC-008**: Plugin works offline (graceful degradation when Ollama unavailable)

## Assumptions

1. **Ollama is the preferred embedding provider** - Users wanting semantic search will use Ollama; graceful degradation per the Embedding Degradation Matrix below
2. **No migration tooling required** - Plugin works seamlessly with existing bash-created memories in ~/.claude/memory/
3. **Enterprise scope is opt-in only** - Organisations must explicitly enable enterprise scope via config.json
4. **Encryption is not a use case** - Data sensitive enough to require encryption should not be stored in the memory system
5. **Node.js runtime available** - Bundled with Claude Code; no separate installation required
6. **Users understand memory types** - Familiarity with decision, learning, gotcha, artifact, breadcrumb, hub taxonomy
7. **Git available for project scope** - Project-scope memories assume git workflow for sharing

## Out of Scope

The following are explicitly **not** included in this feature:

- **Encryption of memory files** - Memory system is for shareable knowledge, not secrets
- **Migration tooling** - Backward compatibility eliminates the need for migration scripts
- **Real-time collaboration** - No multi-user concurrent editing or conflict resolution
- **MCP server implementation** - Skill-first approach; MCP deferred to future consideration
- **Web UI for memory browsing** - CLI and Claude Code integration only
- **Cloud sync** - Memories are local/git-based; no cloud storage integration
- **Memory versioning** - No git-like history for individual memory files
- **Access control lists** - Scope-based isolation only; no fine-grained permissions

## Dependencies

### Required

| Dependency | Purpose | Provided By |
|------------|---------|-------------|
| Node.js runtime | TypeScript execution | Bundled with Claude Code |
| Claude Code plugin system | Plugin loading and lifecycle | Claude Code |
| File system access | Memory file storage | Operating system |

### Optional

| Dependency | Purpose | Fallback |
|------------|---------|----------|
| Ollama | Semantic search embeddings | Keyword search |
| Git | Project-scope memory sharing | Local-only operation |
| managed-settings.json | Enterprise scope via `CLAUDE_MEMORY_ENTERPRISE_PATH` env var | Enterprise scope disabled |

## Embedding Degradation Matrix

Feature availability based on Ollama status:

| Feature | Ollama Available | Ollama Unavailable |
|---------|------------------|-------------------|
| `memory write` | ✅ Full (embedding cached) | ✅ Full (no embedding) |
| `memory read` | ✅ Full | ✅ Full |
| `memory list` | ✅ Full | ✅ Full |
| `memory delete` | ✅ Full | ✅ Full |
| `memory search` (keyword) | ✅ Full | ✅ Full |
| `memory semantic` | ✅ Semantic search | ⚠️ Falls back to keyword search |
| `memory suggest-links` | ✅ AI-powered suggestions | ⚠️ Tag-based suggestions only |
| Gotcha injection relevance | ✅ Semantic matching | ⚠️ Tag/path matching only |
| Embedding cache | ✅ Populated on write | ❌ Empty (rebuilt when available) |

**Degradation Behaviour:**
- **Silent fallback**: Commands succeed with reduced functionality
- **Warning displayed**: User informed of degradation reason and setup instructions
- **No data loss**: Memories created without embeddings are fully functional
- **Automatic recovery**: When Ollama becomes available, embeddings are computed on next access

**Setup Instructions** (displayed when Ollama unavailable):
```
⚠️ Semantic search unavailable: Ollama not detected at http://localhost:11434

To enable semantic search:
  1. Install Ollama: https://ollama.com/download
  2. Pull embedding model: ollama pull embeddinggemma
  3. Start Ollama: ollama serve

Falling back to keyword search.
```
