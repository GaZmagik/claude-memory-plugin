# Feature Specification: Rule and Reminder Graph Nodes

**Feature Branch**: `feature/005-rule-reminder-graph-nodes`
**Created**: 2026-02-19
**Status**: Draft
**Input**: Add support for indexing two categories of external Claude CLI files as read-only graph nodes in the memory knowledge graph, using two new MemoryType values.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rule File Discovery and Indexing (Priority: P1)

As a Claude agent using the memory plugin, I want CLAUDE.md and rules/*.md files to be automatically discovered and indexed as graph nodes, so that semantic search can surface relevant rules alongside memories.

**Why this priority**: This is the foundational capability. Without rule discovery and indexing, none of the other features (semantic search, linking, visualisation) can function. This story delivers immediate value: users can run `memory semantic "no wrapper abstractions"` and get the relevant CLAUDE.md rule.

**Independent Test**: Can be fully tested by running `memory sync` and verifying that CLAUDE.md files are indexed, then running `memory semantic <query>` to verify they appear in search results. Delivers standalone value for semantic discovery of project rules.

**Acceptance Scenarios**:

1. **Given** a project with CLAUDE.md at the project root, **When** `memory sync` runs, **Then** a rule node with ID `rule-project-claude-md` is created in graph.json
2. **Given** a project with ~/.claude/CLAUDE.md, **When** `memory sync` runs, **Then** a rule node with ID `rule-global-claude-md` is created in the global scope graph.json
3. **Given** CLAUDE.md files at multiple ancestor directories above cwd, **When** `memory sync` runs, **Then** each is indexed with a unique ID like `rule-ancestor-2-claude-md`
4. **Given** .claude/rules/security.md exists, **When** `memory sync` runs, **Then** a rule node with ID `rule-project-security` is created
5. **Given** a CLAUDE.md file in node_modules/, **When** `memory sync` runs, **Then** it is excluded from indexing (vendor directory filtering)
6. **Given** a rule node exists, **When** `memory semantic "no wrapper abstractions"` runs, **Then** the relevant rule node appears in results with similarity score
7. **Given** a rule node exists, **When** `memory search "abstractions"` runs, **Then** the rule node appears in keyword search results
8. **Given** a rule file changes content, **When** `memory sync` runs again, **Then** the embedding is regenerated using content-hash cache invalidation

---

### User Story 2 - Reminder File Discovery and Indexing (Priority: P2)

As a specialised agent with persistent memory, I want my MEMORY.md and sub-files to be indexed as graph nodes, so that my reminders are discoverable through semantic search and can be linked to related memories.

**Why this priority**: This completes the external file indexing feature set. Whilst important for agents with persistent memory, it's not critical for basic memory plugin functionality. Rule indexing (P1) provides most of the immediate value; reminder indexing extends the capability to agent-specific knowledge.

**Independent Test**: Can be fully tested by creating agent-memory directories with MEMORY.md files, running `memory sync`, and verifying they appear as reminder nodes. Delivers value for agent-scoped memory discovery.

**Acceptance Scenarios**:

1. **Given** .claude/agent-memory/curator/MEMORY.md exists, **When** `memory sync` runs, **Then** a reminder node with ID `reminder-project-curator-memory` is created in the agent-project scope
2. **Given** .claude/agent-memory/curator/patterns.md exists, **When** `memory sync` runs, **Then** a reminder node with ID `reminder-project-curator-patterns` is created
3. **Given** ~/.claude/agent-memory/curator/MEMORY.md exists, **When** `memory sync` runs, **Then** a reminder node with ID `reminder-global-curator-memory` is created in the agent-global scope
4. **Given** .claude/agent-memory-local/curator/MEMORY.md exists, **When** `memory sync` runs, **Then** it is indexed in local scope with agent=curator metadata
5. **Given** a reminder node exists, **When** `memory semantic "TDD patterns"` runs (with --agent curator), **Then** the relevant reminder node appears in results
6. **Given** a reminder file is modified, **When** `memory sync` runs, **Then** the embedding is updated via content-hash detection

---

### User Story 3 - Read-Only Node Protection (Priority: P1)

As a user of the memory plugin, I want rule and reminder nodes to be protected from modification, so that external files owned by Claude CLI are never corrupted by plugin commands.

**Why this priority**: Data safety is critical. Without read-only protection, users could accidentally corrupt CLAUDE.md or agent MEMORY.md files through memory commands, breaking their Claude configuration. This is a showstopper bug if not addressed from day one.

**Independent Test**: Can be fully tested by attempting to run `memory write`, `memory delete`, `memory rename`, `memory move`, or `memory promote` on a rule/reminder node and verifying each command rejects with a clear error message. Delivers critical data safety guarantee.

**Acceptance Scenarios**:

1. **Given** a rule node with ID `rule-project-claude-md` exists, **When** `memory delete rule-project-claude-md` runs, **Then** it fails with error "rule-project-claude-md is a read-only external node. Run 'memory sync' to refresh it."
2. **Given** a reminder node exists, **When** `memory write` attempts to update it via JSON stdin, **Then** it fails with the same read-only error
3. **Given** a rule node exists, **When** `memory rename rule-project-claude-md new-id` runs, **Then** it fails with read-only error
4. **Given** a rule node exists, **When** `memory move rule-project-claude-md global` runs, **Then** it fails with read-only error
5. **Given** a reminder node exists, **When** `memory promote reminder-project-curator-memory decision` runs, **Then** it fails with read-only error
6. **Given** a rule node exists, **When** `memory read rule-project-claude-md` runs, **Then** it succeeds and displays the full external file content (read operations are permitted)

---

### User Story 4 - Graph Visualisation and Linking (Priority: P2)

As a user exploring the knowledge graph, I want rule and reminder nodes to appear visually distinct in Mermaid diagrams and be linkable to regular memories, so that I can understand governance and contextual relationships.

**Why this priority**: This enhances discoverability and understanding of the knowledge graph structure. Whilst valuable for graph exploration, it's not essential for basic functionality. Users can still search and link nodes without visual distinction; Mermaid rendering is a quality-of-life improvement.

**Independent Test**: Can be fully tested by running `memory mermaid` and verifying rule/reminder nodes have distinct shapes (hexagon for rules, cylinder for reminders), then running `memory link <memory-id> <rule-id> governed-by` and confirming the edge is created. Delivers visual clarity and explicit relationship modelling.

**Acceptance Scenarios**:

1. **Given** a rule node exists in the graph, **When** `memory mermaid` runs, **Then** the rule node is rendered with hexagon shape `{{ }}` and a distinct colour
2. **Given** a reminder node exists in the graph, **When** `memory mermaid` runs, **Then** the reminder node is rendered with cylinder shape `[( )]` and a distinct colour
3. **Given** a decision memory and a rule node exist, **When** `memory link decision-001 rule-project-claude-md governed-by` runs, **Then** an edge with label "governed-by" is created from decision to rule
4. **Given** a gotcha memory and a reminder node exist, **When** `memory link gotcha-001 reminder-project-curator-memory reminded-by` runs, **Then** an edge with label "reminded-by" is created
5. **Given** a rule node with edges, **When** `memory edges rule-project-claude-md` runs, **Then** it lists all inbound and outbound edges for the rule node
6. **Given** a rule and reminder node exist, **When** `memory unlink decision-001 rule-project-claude-md` runs, **Then** the governed-by edge is removed successfully
7. **Given** a rule node exists, **When** `memory suggest-links` runs, **Then** the rule node appears as a candidate for semantic linking to related memories

---

### User Story 5 - Targeted Context Re-Indexing (Priority: P3)

As a user who has modified CLAUDE.md or agent memory files, I want a fast `memory index-context` command to refresh only external file nodes, so that I don't have to run a full `memory sync` for lightweight updates.

**Why this priority**: This is a convenience optimisation. `memory sync` already handles re-indexing, so this story provides incremental value by reducing latency for targeted updates. It's nice-to-have but not essential for core functionality.

**Independent Test**: Can be fully tested by modifying a CLAUDE.md file, running `memory index-context`, and verifying the rule node's embedding is updated without triggering full sync reconciliation. Delivers fast-path refresh for frequent rule edits.

**Acceptance Scenarios**:

1. **Given** rule and reminder nodes exist, **When** `memory index-context` runs, **Then** only external file discovery and indexing executes (skipping orphan reconciliation and other sync tasks)
2. **Given** a CLAUDE.md file is modified, **When** `memory index-context` runs, **Then** the rule node's content and embedding are updated
3. **Given** multiple rule files exist, **When** `memory index-context --scope project` runs, **Then** only project-scope rules are re-indexed (performance optimisation)
4. **Given** no external files have changed, **When** `memory index-context` runs, **Then** it completes quickly using content-hash cache (no unnecessary embedding regeneration)

---

### Edge Cases

- **What happens when a CLAUDE.md file is deleted from the filesystem?**
  The next `memory sync` or `memory index-context` run should detect the missing file and remove the corresponding rule node from the graph (safe cleanup).

- **What happens when two CLAUDE.md files exist at the same directory level (e.g., both CLAUDE.md and .claude/CLAUDE.md)?**
  Both should be indexed with distinct IDs. The discovery algorithm walks the directory tree and collects all matches; .claude/CLAUDE.md gets a distinct ID from CLAUDE.md at the same level.

- **What happens when an agent directory exists but contains no MEMORY.md file?**
  No reminder node is created for that agent. Discovery only indexes files that exist; missing MEMORY.md is not an error condition.

- **What happens when a rule or reminder file is extremely large (>100KB)?**
  The existing `truncateForEmbedding()` function (6000 character limit) handles this gracefully, indexing only the first portion of the file for semantic search.

- **What happens when Ollama is unavailable during sync?**
  Rule and reminder nodes are still indexed in graph.json and index.json, but embeddings are skipped (graceful degradation). Semantic search won't include them until embeddings are generated. User can run `memory index-context` after Ollama is restored.

- **What happens when a user attempts to create a memory with ID `rule-project-claude-md` (colliding with a rule node)?**
  The write operation should fail with a clear error indicating the ID is reserved for an external file node.

- **How does system handle relative paths in agent-memory directories that contain symlinks?**
  Discovery should resolve symlinks using realpath to ensure deterministic ID generation and prevent duplicate indexing of the same file via different paths.

- **What happens when `memory audit` or `memory quality` runs on a rule or reminder node?**
  These nodes should be auto-excluded from quality scoring (their metadata like tag count and severity is meaningless for externally-owned files). Document this exclusion behaviour.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add two new MemoryType enum values: `rule` and `reminder`
- **FR-002**: System MUST discover CLAUDE.md and CLAUDE.local.md files by walking up from cwd to home directory in deterministic order (sorted by depth, then alphabetically). When multiple files exist at the same directory level (e.g., both CLAUDE.md and .claude/CLAUDE.md), all are indexed with distinct IDs using suffixes: -root (for top-level), -dotclaude (for .claude/), -dotclaude-local (for .claude/ local variant)
- **FR-003**: System MUST discover rules/*.md files in .claude/rules/ (project scope) and ~/.claude/rules/ (global scope)
- **FR-004**: System MUST discover MEMORY.md and sub-files in .claude/agent-memory/{name}/ (agent-project scope), .claude/agent-memory-local/{name}/ (local scope), and ~/.claude/agent-memory/{name}/ (agent-global scope)
- **FR-005**: System MUST exclude CLAUDE.md files in vendor directories (node_modules, .git, vendor, dist, build) from discovery
- **FR-006**: System MUST generate deterministic IDs for external file nodes using the ID scheme defined in exploration (e.g., `rule-project-claude-md`, `reminder-global-curator-memory`). Agent names in IDs preserve hyphens and convert spaces to hyphens (e.g., agent "speckit-planner" becomes "speckit-planner", agent "My Agent" becomes "my-agent")
- **FR-007**: System MUST store external file nodes with type `rule` or `reminder` in graph.json and index.json at the appropriate scope (project/local/global/agent-project/agent-global). Note: Local-scoped reminder files from .claude/agent-memory-local/ are stored in project graph.json with agent metadata field, not in separate agent-local graph files
- **FR-008**: System MUST generate embeddings for rule and reminder nodes using the existing Ollama pipeline with graceful fallback if Ollama is unavailable
- **FR-009**: System MUST add two optional fields to IndexEntry interface: `externalFileKind` (string) and `externalPath` (string) for storing external file metadata
- **FR-010**: System MUST read external file content from `externalPath` field when displaying node content via `memory read`
- **FR-011**: System MUST invalidate embeddings for external file nodes when content changes (detected via content-hash comparison)
- **FR-012**: System MUST integrate external file discovery into `memory sync` and `memory rebuild` as a final pass after existing reconciliation
- **FR-013**: System MUST provide a new `memory index-context` command for targeted re-indexing of external files only
- **FR-014**: `memory index-context` MUST support an optional `--scope` flag to limit re-indexing to specific scopes (project/local/global)
- **FR-015**: System MUST reject `memory write`, `memory delete`, `memory rename`, `memory move`, and `memory promote` operations on nodes with type `rule` or `reminder` with error message: "'<id>' is a read-only external node. Run 'memory sync' to refresh it."
- **FR-016**: System MUST permit `memory read`, `memory search`, `memory semantic`, `memory link`, `memory unlink`, and `memory edges` operations on rule and reminder nodes (read-only operations)
- **FR-017**: System MUST add two new EdgeType enum values: `governed-by` (memory → rule) and `reminded-by` (memory → reminder)
- **FR-018**: System MUST render rule nodes in Mermaid diagrams with hexagon shape `{{ }}` and a distinct colour
- **FR-019**: System MUST render reminder nodes in Mermaid diagrams with cylinder shape `[( )]` and a distinct colour
- **FR-020**: System MUST include rule and reminder nodes as candidates in `memory suggest-links` semantic relationship discovery
- **FR-021**: System MUST auto-exclude rule and reminder nodes from `memory audit` and `memory quality` scoring operations
- **FR-022**: System MUST remove rule or reminder nodes from the graph when the corresponding external file is deleted (detected during sync)
- **FR-023**: System MUST resolve symlinks in agent-memory directories to canonical paths for deterministic ID generation. When symlink resolution fails (broken symlinks), system MUST log a warning with the symlink path and skip the file, continuing discovery of remaining files
- **FR-024**: System MUST skip external files larger than 1MB with a warning message, preventing event loop blocking during file I/O. Files within the 1MB limit are read and truncated to 6000 characters for embedding generation

### Key Entities *(include if feature involves data)*

- **ExternalFileEntry**: Represents a discovered external file (CLAUDE.md, rules/*.md, MEMORY.md, sub-files) with properties: `absolutePath`, `kind` (ExternalFileKind enum), `scope` (project/local/global/agent-project/agent-global), `agentName` (optional, for reminders), `contentHash`

- **ExternalFileKind**: Enum distinguishing sub-types within rule and reminder categories:
  - For rules: `'claude-instructions'`, `'claude-local-instructions'`, `'rules-file'`
  - For reminders: `'agent-memory-summary'` (MEMORY.md), `'agent-memory-sub-file'` (patterns.md, debugging.md, etc.)

- **IndexEntry extension**: Existing interface extended with two optional fields:
  - `externalFileKind?: string` — which sub-kind of rule/reminder
  - `externalPath?: string` — absolute path to source file (authoritative for reads)

- **Rule Node**: A graph node with type `MemoryType.Rule`, representing a CLAUDE.md, CLAUDE.local.md, or rules/*.md file. Contains metadata: `id`, `title` (derived from filename), `type` ('rule'), `scope`, `externalPath`, `externalFileKind`, `embedding`, `contentHash`

- **Reminder Node**: A graph node with type `MemoryType.Reminder`, representing a MEMORY.md or sub-file in an agent-memory directory. Contains metadata: `id`, `title`, `type` ('reminder'), `scope`, `agentName`, `externalPath`, `externalFileKind`, `embedding`, `contentHash`

- **Governed-By Edge**: A directed edge from a memory node to a rule node, indicating the memory's decision or implementation is motivated by or compliant with the rule

- **Reminded-By Edge**: A directed edge from a memory node to a reminder node, indicating the memory is contextualised or informed by the agent's persistent knowledge

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `memory sync` discovers and indexes all rule files (CLAUDE.md, CLAUDE.local.md, rules/*.md) in known paths without manual intervention
- **SC-002**: `memory sync` discovers and indexes all reminder files (MEMORY.md and sub-files) in agent-memory directories for all agents
- **SC-003**: `memory semantic "no wrapper abstractions"` returns the relevant CLAUDE.md rule node in search results with similarity score > 0.45 (semantic threshold)
- **SC-004**: `memory search "TDD"` returns rule nodes containing TDD guidance alongside decision and learning memories
- **SC-005**: `memory mermaid` generates diagrams where rule nodes appear as hexagons and reminder nodes appear as cylinders with distinct colours
- **SC-006**: `memory link <memory-id> <rule-id> governed-by` successfully creates edges between memories and rules, visible in `memory edges` output
- **SC-007**: `memory delete <rule-id>` fails with clear error message for 100% of rule and reminder nodes (read-only protection)
- **SC-008**: `memory suggest-links` includes rule and reminder nodes as candidates when semantically similar to existing memories (threshold > 0.45)
- **SC-009**: CLAUDE.md discovery correctly walks directory tree from cwd to home, indexing files at all ancestor levels without duplication
- **SC-010**: `memory index-context` completes re-indexing of 10+ external files in under 5 seconds (excluding embedding generation time), demonstrating performance advantage over full sync
- **SC-011**: Rule and reminder nodes survive `memory rebuild` without data loss (nodes are recreated from external files during rebuild)
- **SC-012**: `memory audit` excludes rule and reminder nodes from quality scoring reports (0 rule/reminder nodes appear in audit output)
