---
user_stories:
  - id: "US1"
    title: "Agent Memory Storage and Retrieval"
    priority: "P1"
    independently_testable: true
  - id: "US2"
    title: "Agent Scope Hierarchy Resolution"
    priority: "P1"
    independently_testable: true
  - id: "US3"
    title: "CLI Agent Targeting with --agent Flag"
    priority: "P2"
    independently_testable: true
  - id: "US4"
    title: "Cross-Scope Memory Linking"
    priority: "P2"
    independently_testable: true
  - id: "US5"
    title: "Agent-Specific Graph Integration"
    priority: "P3"
    independently_testable: true
  - id: "US6"
    title: "Agent Memory Context Injection"
    priority: "P3"
    independently_testable: true
---

# Feature Specification: Agent-Scoped Memories

**Feature Branch**: `feature/003-agent-scoped-memories`
**Created**: 2026-02-01
**Status**: Ready for Approval (Gate 1)
**Input**: User description: "Agents need their own memory namespaces separate from project/global memories. This enables agents to maintain their own learnings, decisions, and artifacts whilst still accessing shared project knowledge."

## Terminology

**Agent scope** (general): The concept of agent-specific memory namespaces, encompassing both agent-project and agent-global scopes.

**Agent-project scope** (specific): Agent memories stored in `.claude/memory/agents/{agent-name}/` within a git repository, shareable with the team.

**Agent-global scope** (specific): Agent memories stored in `~/.claude/memory/agents/{agent-name}/` in the user's home directory, personal to the individual user.

**Casing conventions**: This specification uses kebab-case (e.g., `agent-project`) in documentation and user-facing content. The TypeScript implementation uses PascalCase for enum values (e.g., `AgentProject`) per language conventions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent Memory Storage and Retrieval (Priority: P1)

As a Claude Code user working with specialised agents, I want agents to maintain their own isolated memory storage so that agent-specific learnings don't clutter project memories and agents can build domain expertise over time.

**Why this priority**: This is the foundational capability. Without agent-scoped storage, agents cannot maintain separate knowledge bases. All other agent memory features depend on this working correctly.

**Independent Test**: Can be fully tested by creating an agent memory with `memory write --agent typescript-expert`, reading it back with `memory read <id> --agent typescript-expert`, and verifying it's isolated from project memories. Delivers immediate value as agent knowledge persistence.

**Acceptance Scenarios**:

1. **Given** no existing agent memories, **When** I run `memory write --title "ESM imports require .js extensions" --type learning --agent typescript-expert`, **Then** a markdown file is created in `.claude/memory/agents/typescript-expert/permanent/`
2. **Given** an agent memory exists at `.claude/memory/agents/typescript-expert/permanent/learning-esm-imports.md`, **When** I run `memory read learning-esm-imports --agent typescript-expert`, **Then** the full memory content is displayed
3. **Given** agent memories exist for typescript-expert, **When** I run `memory list --agent typescript-expert`, **Then** only typescript-expert's memories are listed, not project or global memories
4. **Given** an agent memory exists, **When** I run `memory delete learning-esm-imports --agent typescript-expert`, **Then** the memory file is removed from the agent's directory and the agent's graph is updated
5. **Given** agent-scoped and project-scoped memories exist with similar content, **When** I search without `--agent` flag, **Then** only project/global memories are returned (backward compatibility)

---

### User Story 2 - Agent Scope Hierarchy Resolution (Priority: P1)

As a Claude Code user working with agents across multiple projects, I want agent memories to follow a scope hierarchy (agent-project → agent-global → project → global) so that agents can maintain both project-specific and cross-project knowledge whilst inheriting shared project context.

**Why this priority**: Scope hierarchy is foundational and must be implemented alongside US1. It determines the search order and fallback behaviour for all agent memory operations.

**Independent Test**: Can be tested by creating agent memories at both project and global scopes, then searching to verify the correct hierarchy is followed.

**Acceptance Scenarios**:

1. **Given** I'm in a git repository, **When** I run `memory write "Project-specific pattern" --agent typescript-expert` (no scope specified), **Then** the memory is stored in `.claude/memory/agents/typescript-expert/permanent/` (agent-project scope, the default)
2. **Given** I'm in a git repository, **When** I run `memory write "Cross-project pattern" --agent typescript-expert --scope global`, **Then** the memory is stored in `~/.claude/memory/agents/typescript-expert/permanent/` (agent-global scope)
3. **Given** agent memories exist at both agent-project and agent-global scopes, **When** I run `memory search "pattern" --agent typescript-expert`, **Then** memories from both agent scopes are returned with scope indicators, ordered by agent-project first
4. **Given** agent memories and project memories exist, **When** I run `memory search "pattern" --agent typescript-expert --include-shared`, **Then** memories from agent-project, agent-global, project, and global scopes are returned in that order
5. **Given** no agent memories match a search, **When** I run `memory search "pattern" --agent typescript-expert --include-shared`, **Then** the search falls back to project and global scopes
6. **Given** I'm outside a git repository, **When** I run `memory write "Note" --agent typescript-expert` (no scope), **Then** the memory is stored in `~/.claude/memory/agents/typescript-expert/permanent/` (agent-global scope, the default when not in a repo)

---

### User Story 3 - CLI Agent Targeting with --agent Flag (Priority: P2)

As a Claude Code user, I want all memory CLI commands to accept an `--agent <name>` flag so that I can perform any memory operation within an agent's scope without changing existing workflows.

**Why this priority**: CLI integration is required for agents to be usable, but the core storage (US1) and hierarchy (US2) must exist first. This is an interface layer over the foundational capabilities.

**Independent Test**: Can be tested by running each CLI command with `--agent` flag and verifying it operates within the agent's scope.

**Acceptance Scenarios**:

1. **Given** the memory CLI is available, **When** I run `memory help write`, **Then** the help text includes documentation for the `--agent <name>` flag
2. **Given** agent memories exist, **When** I run `memory list --agent rust-expert --type gotcha`, **Then** only gotcha-type memories from rust-expert's scope are listed
3. **Given** agent memories exist, **When** I run `memory search "ownership" --agent rust-expert`, **Then** full-text search is scoped to rust-expert's memories
4. **Given** agent memories exist, **When** I run `memory semantic "borrow checker" --agent rust-expert`, **Then** semantic search is scoped to rust-expert's embeddings
5. **Given** agent memories exist, **When** I run `memory tag learning-ownership concurrency --agent rust-expert`, **Then** the tag is added to the agent-scoped memory
6. **Given** two agent memories exist, **When** I run `memory link learning-ownership gotcha-lifetime-elision --agent rust-expert`, **Then** a link is created in rust-expert's graph.json
7. **Given** I run a command without `--agent` flag, **When** the command executes, **Then** it behaves exactly as before (project/global scope), ensuring backward compatibility

---

### User Story 4 - Cross-Scope Memory Linking (Priority: P2)

As a Claude Code user, I want agent memories to link to project/global memories and vice versa so that agents can reference shared knowledge and project memories can acknowledge agent-specific implementations.

**Why this priority**: Cross-scope linking enables agents to build on shared project knowledge. Requires graph operations to work first, making this dependent on US3.

**Independent Test**: Can be tested by creating a project memory and an agent memory, linking them together, and verifying the link appears in both scopes' graphs and impact analysis.

**Acceptance Scenarios**:

1. **Given** a project memory "decision-use-typescript.md" and agent memory exists, **When** I run `memory link decision-use-typescript learning-esm-imports --agent typescript-expert --label "informs"`, **Then** the edge is stored in both project graph.json and agent graph.json with scope metadata
2. **Given** an agent memory links to a project memory, **When** I run `memory edges learning-esm-imports --agent typescript-expert`, **Then** the linked project memory is shown with scope indicator `[project]`
3. **Given** a project memory links to an agent memory, **When** I run `memory edges decision-use-typescript` (no --agent), **Then** the linked agent memory is shown with scope indicator `[agent:typescript-expert]`
4. **Given** cross-scope links exist, **When** I run `memory graph decision-use-typescript`, **Then** the Mermaid diagram includes nodes from both scopes with distinct visual styling
5. **Given** cross-scope links exist, **When** I delete a project memory that an agent memory links to, **Then** the link is removed from the agent's graph.json and orphan detection flags the agent memory
6. **Given** cross-scope links exist, **When** I run `memory impact decision-use-typescript`, **Then** the impact analysis traverses into agent scopes and reports affected agent memories

---

### User Story 5 - Agent-Specific Graph Integration (Priority: P3)

As a Claude Code user, I want agent memory graphs to be visually distinct and integrated with project graphs so that I can understand the knowledge structure maintained by each agent.

**Why this priority**: Graph visualisation is a quality-of-life feature that builds on cross-scope linking. Less critical than core operations but valuable for understanding agent knowledge.

**Independent Test**: Can be tested by creating agent memories with links, generating a graph, and verifying agent nodes are visually distinct.

**Acceptance Scenarios**:

1. **Given** agent memories are linked, **When** I run `memory mermaid --agent typescript-expert`, **Then** a Mermaid diagram of only the agent's graph is generated
2. **Given** cross-scope links exist, **When** I run `memory mermaid --include-shared --agent typescript-expert`, **Then** agent nodes are styled differently from project nodes (e.g., different colours or borders)
3. **Given** multiple agents have memories, **When** I run `memory stats --agent typescript-expert`, **Then** graph statistics show only typescript-expert's nodes and edges
4. **Given** agent memories exist, **When** I run `memory suggest-links --agent typescript-expert`, **Then** link suggestions are made within agent scope and to relevant project memories
5. **Given** orphan agent memories exist, **When** I run `memory health --agent typescript-expert`, **Then** orphans are identified relative to the agent's graph only

---

### User Story 6 - Agent Memory Context Injection (Priority: P3)

As a Claude Code agent, I want my agent-scoped gotchas and learnings to be injected when I'm invoked so that I proactively apply my domain expertise without manual memory retrieval.

**Why this priority**: Context injection is a quality-of-life automation that builds on gotcha injection hooks. Requires agent identification infrastructure that may not exist yet.

**Independent Test**: Can be tested by creating agent-scoped gotchas, invoking the agent, and verifying the gotchas appear in the agent's context.

**Acceptance Scenarios**:

1. **Given** a typescript-expert agent has gotcha memories tagged "typescript", **When** the typescript-expert agent is invoked and reads a TypeScript file, **Then** agent-scoped gotchas are injected in addition to project gotchas
2. **Given** agent-scoped and project-scoped gotchas both match, **When** context injection occurs, **Then** agent-scoped gotchas are prioritised higher (shown first)
3. **Given** an agent has learnings about a specific topic, **When** the agent is invoked with a task related to that topic, **Then** relevant agent learnings are injected as context [NEEDS CLARIFICATION: How is "related to that topic" determined? Semantic similarity? Tags? User prompt analysis?]
4. **Given** an agent has been invoked multiple times in a session, **When** gotcha injection occurs, **Then** agent-scoped gotchas are deduplicated per session (same deduplication as project gotchas)
5. **Given** no agent is explicitly identified in the current context, **When** memory operations run, **Then** no agent-scoped context injection occurs (backward compatibility)

---

### Edge Cases

- What happens when an agent name contains special characters or spaces? → Sanitise agent names to filesystem-safe slugs (lowercase, hyphens only)
- What happens when an agent memory and project memory have the same ID? → IDs include scope prefix: `agent-typescript-expert:learning-esm` vs `project:learning-esm`
- What happens when moving a memory from agent scope to project scope? → `memory move <id> --from-agent typescript-expert --to-scope project` updates scope metadata and reindexes
- What happens when an agent directory doesn't exist yet? → Auto-create `.claude/memory/agents/<agent-name>/permanent/` on first write
- What happens when listing all agents? → `memory agents` command lists all agent directories with memory counts
- What happens when searching across all agents? → `memory search "pattern" --all-agents` searches all agent scopes
- What happens when an agent memory links to another agent's memory? → Cross-agent linking is supported with scope indicator `[agent:other-agent]`

## Requirements *(mandatory)*

### Functional Requirements

**Agent Storage (US1)**:
- **FR-001**: System MUST store agent memories in `.claude/memory/agents/<agent-name>/permanent/` for agent-project scope
- **FR-002**: System MUST store agent memories in `~/.claude/memory/agents/<agent-name>/permanent/` for agent-global scope
- **FR-003**: System MUST sanitise agent names to filesystem-safe slugs (lowercase alphanumeric and hyphens only)
- **FR-004**: Each agent scope MUST have its own `index.json` for fast lookups
- **FR-005**: Each agent scope MUST have its own `graph.json` for relationship tracking
- **FR-006**: Each agent scope MUST have its own `embeddings.json` for semantic search
- **FR-007**: Agent memory frontmatter MUST include `scope` field with value `agent-project` or `agent-global`
- **FR-008**: Agent memory frontmatter MUST include `agent` field with agent name

**Scope Hierarchy (US2)**:
- **FR-009**: System MUST resolve agent scope hierarchy: agent-project → agent-global → project → local → global
- **FR-010**: Default scope for `--agent` operations in git repositories MUST be agent-project
- **FR-011**: Default scope for `--agent` operations outside git repositories MUST be agent-global
- **FR-012**: System MUST support `--include-shared` flag to search project/global scopes from agent context
- **FR-013**: System MUST indicate scope in search results with scope indicators: `[agent-project]`, `[agent-global]`, `[project]`, `[global]`, `[local]`
- **FR-014**: When no agent memories match a search, system MUST NOT automatically fall back to shared scopes unless `--include-shared` is specified

**CLI Integration (US3)**:
- **FR-015**: All memory CLI commands MUST accept `--agent <name>` flag
- **FR-016**: Commands without `--agent` flag MUST behave identically to pre-feature behaviour (backward compatibility)
- **FR-017**: `memory help <command>` MUST document the `--agent` flag for all applicable commands
- **FR-018**: System MUST provide `memory agents` command to list all agent directories with memory counts
- **FR-019**: System MUST support `--all-agents` flag for searching across all agent scopes
- **FR-020**: Error messages for agent operations MUST include agent name context

**Cross-Scope Linking (US4)**:
- **FR-021**: System MUST support linking agent memories to project/global memories
- **FR-022**: System MUST support linking project/global memories to agent memories
- **FR-023**: Cross-scope links MUST be stored in both source and target scope's graph.json files
- **FR-024**: Cross-scope links MUST include scope metadata: `sourceScope`, `targetScope`, `targetAgent` (if applicable)
- **FR-025**: `memory edges` MUST show scope indicators for linked memories from other scopes
- **FR-026**: `memory impact` MUST traverse cross-scope links and report affected memories in all scopes
- **FR-027**: When deleting a memory with cross-scope links, system MUST clean up links in all affected scopes
- **FR-028**: System MUST support linking between different agent scopes (cross-agent linking)

**Graph Visualisation (US5)**:
- **FR-029**: `memory mermaid --agent <name>` MUST generate graph including only agent scope
- **FR-030**: `memory mermaid --agent <name> --include-shared` MUST generate graph with agent and shared scopes
- **FR-031**: Agent nodes in Mermaid diagrams MUST use distinct visual styling (different colour or border)
- **FR-032**: Scope indicators MUST appear in Mermaid node labels: `[A:name]` for agent, `[P]` for project, `[G]` for global
- **FR-033**: `memory stats --agent <name>` MUST report statistics for agent scope only
- **FR-034**: `memory health --agent <name>` MUST validate agent scope integrity (orphans, broken links, frontmatter)

**Context Injection (US6)**:
- **FR-035**: System MUST inject agent-scoped gotchas when agent is identified in current context [NEEDS CLARIFICATION: How is agent identity determined? Environment variable? Hook metadata? Agent invocation marker?]
- **FR-036**: Agent-scoped gotchas MUST be prioritised higher than project gotchas in injection order
- **FR-037**: Agent-scoped context injection MUST respect session deduplication (no repeated gotchas)
- **FR-038**: System MUST support `--agent` flag in hooks configuration to enable agent-specific injection
- **FR-039**: When no agent is identified, system MUST NOT inject agent-scoped context (backward compatibility)

**Backward Compatibility**:
- **FR-040**: All existing memory CLI commands MUST work unchanged without `--agent` flag
- **FR-041**: Existing memory files MUST remain readable without migration
- **FR-042**: Scope resolution without `--agent` MUST follow existing hierarchy: enterprise → local → project → global
- **FR-043**: Agent scope MUST NOT interfere with existing hooks unless explicitly configured

### Key Entities

- **AgentScope**: An isolated memory namespace for a specific agent, stored in `.claude/memory/agents/<agent-name>/`
- **AgentMemory**: A memory file with `agent` and `scope` frontmatter fields, stored in agent directory
- **AgentGraph**: An adjacency list in `<agent-scope>/graph.json` mapping agent memory IDs to edges
- **AgentIndex**: Cached metadata in `<agent-scope>/index.json` for agent memory lookups
- **CrossScopeLink**: An edge connecting memories from different scopes (agent↔project, agent↔global, agent↔agent)
- **ScopeIndicator**: Visual marker showing memory scope in CLI output: `[agent-project]`, `[agent-global]`, `[project]`, `[global]`
- **AgentIdentity**: Metadata identifying which agent is currently active (for context injection)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Agent memories are completely isolated from project memories (no cross-contamination in default operations)
- **SC-002**: Agent scope hierarchy resolves correctly in 100% of test cases (agent-project → agent-global → project → global)
- **SC-003**: All CLI commands support `--agent` flag without breaking existing functionality
- **SC-004**: Cross-scope links are bidirectional and survive memory deletion in all test scenarios
- **SC-005**: Agent memory operations complete within same performance targets as project operations (<100ms CRUD, <500ms graph)
- **SC-006**: Backward compatibility: All existing memory commands work identically without `--agent` flag
- **SC-007**: Agent directories are auto-created on first write without manual setup
- **SC-008**: Mermaid diagrams correctly distinguish agent nodes from project nodes with visual styling

## Assumptions

1. **Agent names are stable** - Agent identity doesn't change frequently; renaming agents is a manual operation
2. **Agents are identified externally** - Agent identity comes from CLI flags, not auto-detection (at least in v1.3.0)
3. **Agent memory counts are reasonable** - Each agent maintains <1000 memories; performance optimisation for massive agent graphs is deferred
4. **Git workflow for agent-project scope** - Agent-project memories follow same git workflow as project memories (committed to repo)
5. **No agent authentication** - Any user can read/write any agent's memories; access control is out of scope
6. **Agent names are unique** - No namespace collisions between agent names
7. **Cross-scope linking is explicit** - System doesn't auto-create cross-scope links; users/agents must create them intentionally

## Out of Scope

The following are explicitly **not** included in this feature:

- **Agent authentication/authorisation** - No verification that the correct agent is accessing its memories
- **Agent auto-detection** - Determining which agent is currently active from context alone
- **Agent memory encryption** - Same as project memories, encryption is not a use case
- **Agent memory quotas** - No limits on agent memory storage size
- **Agent memory migration tools** - Moving memories between agents or scopes is manual
- **Agent-specific UI** - No separate interface for agent memory management
- **Multi-agent collaboration** - No shared workspaces or concurrent agent editing
- **Agent memory versioning** - No history tracking for agent memory changes
- **Agent memory analytics** - No usage statistics or learning curve analysis

## Dependencies

### Required

| Dependency | Purpose | Provided By |
|------------|---------|-------------|
| Existing scope resolver | Extend with agent scopes | skills/memory/src/scope/resolver.ts |
| Existing graph system | Extend to support cross-scope links | skills/memory/src/graph/ |
| Existing index system | Create per-agent indexes | skills/memory/src/core/index.ts |
| Existing CLI parser | Add `--agent` flag support | skills/memory/src/cli/parser.ts |
| Frontmatter system | Add `agent` and updated `scope` fields | skills/memory/src/core/frontmatter.ts |

### Optional

| Dependency | Purpose | Fallback |
|------------|---------|----------|
| Agent invocation metadata | Auto-inject agent context | Manual `--agent` flag |
| Ollama embeddings | Agent-scoped semantic search | Agent-scoped keyword search |

## Open Questions

1. **Agent Identity Detection**: How should the system determine which agent is currently active for context injection? Options:
   - Environment variable set by agent framework
   - Hook metadata passed from Claude Code
   - Agent invocation marker in user prompt
   - Manual `--agent` flag only (defer auto-detection to future)

2. **Agent Naming Conventions**: Should agent names follow a strict pattern? Options:
   - Freeform (sanitised to filesystem-safe)
   - Namespaced by category: `lang:typescript-expert`, `domain:api-architect`
   - Require registration in a manifest file

3. **Agent Memory Visibility**: Should project members see agent memories by default? Options:
   - Agent-project memories visible in standard `memory list` (opt-out with `--exclude-agents`)
   - Agent-project memories hidden unless `--agent` or `--include-agents` specified (opt-in)
   - Configurable per project in config.json

4. **Cross-Agent Linking**: Should agents be able to link to other agents' memories? Options:
   - Enabled by default (agents can reference each other's knowledge)
   - Disabled by default (agents are isolated)
   - Configurable per agent

5. **Agent Memory Scope Defaults**: Should `memory write --agent X` default to agent-project or agent-global? Options:
   - Agent-project (git-tracked, shareable) when in repo
   - Agent-global (personal) always
   - Configurable in config.json

**Recommendation**: For v1.3.0, use conservative defaults:
- Agent identity via `--agent` flag only (no auto-detection)
- Freeform agent names, sanitised
- Agent memories hidden unless `--agent` specified (opt-in)
- Cross-agent linking enabled
- Default to agent-project when in git repo, agent-global otherwise
