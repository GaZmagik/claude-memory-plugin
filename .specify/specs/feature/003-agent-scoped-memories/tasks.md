---
# YAML Frontmatter for spec-lint
description: "Executable task list for agent-scoped memories feature"
phases:
  - id: 0
    name: "Phase 0: Research Validation"
    maps_to: []
  - id: 1
    name: "Phase A: Foundation (Scope System Extension)"
    maps_to: ["US1", "US2"]
  - id: 2
    name: "Phase B: Storage Infrastructure"
    maps_to: ["US1", "US2"]
  - id: 3
    name: "Phase C: CLI Integration"
    maps_to: ["US3"]
  - id: 4
    name: "Phase D: Cross-Scope Graph Operations"
    maps_to: ["US4"]
  - id: 5
    name: "Phase E: Advanced Features"
    maps_to: ["US5"]
  - id: 6
    name: "Phase F: Context Injection Preparation"
    maps_to: ["US6"]
  - id: 7
    name: "Phase G: Integration & Documentation"
    maps_to: ["US1", "US2", "US3", "US4", "US5", "US6"]
---

# Tasks: Agent-Scoped Memories

**Feature**: 003-agent-scoped-memories
**Input**: Design documents from `/home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/003-agent-scoped-memories/`
**Prerequisites**: spec.md, plan/plan.md, plan/data-model.md, plan/contracts/cli-commands.md, plan/contracts/api-types.md

**TDD Workflow**: All implementation tasks follow Red-Green-Refactor cycle

**Organisation**: Tasks grouped by phase, with user story tags for traceability

---

## TDD Workflow Integration

**Checklist Reference**: `.specify/tdd-checklist.md`

Each implementation task follows the **Red-Green-Refactor** cycle:

| Phase | Action | Verification |
|-------|--------|--------------|
| 🔴 **Red** | Write failing test | Test compiles, runs, and **fails** for expected reason |
| 🟢 **Green** | Write minimum code to pass | Test now **passes** |
| 🔵 **Refactor** | Clean up without changing behaviour | All tests still **pass** |

**TDD Status Reporting**: Include in task completion:
```
TDD: test first? ✅/❌ | seen failing? ✅/❌ | now passing? ✅/❌
```

---

## Phase 0: Research Validation

**Purpose**: Validate research findings, verify dependencies, prepare environment

**Duration**: 0.5 day

- [X] T001 Review plan/research.md findings and validate technical decisions for agent scoping
- [X] T002 [P] Verify existing scope resolver in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/resolver.ts
- [X] T003 [P] Verify existing graph system in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/
- [X] T004 [P] Verify existing index system in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/index.ts
- [X] T005 [P] Verify existing frontmatter system in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/frontmatter.ts
- [X] T006 [P] Verify existing CLI parser in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/parser.ts

**Checkpoint**: Research validated, existing services confirmed, ready for implementation

---

## Phase A: Foundation (Scope System Extension)

**Goal**: Extend scope system to recognise and resolve agent scopes

**Duration**: 2-3 days

**Maps to**: US1 (Agent Memory Storage), US2 (Scope Hierarchy)

### Tests for Phase A

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T007 [P] [US1] Unit test for AgentProject and AgentGlobal in Scope enum in /home/gareth/.vs/claude-memory-plugin/tests/unit/scope/test-scope-enum.spec.ts
- [X] T008 [P] [US1] Unit test for agent name sanitisation (spaces, special chars, Unicode) in /home/gareth/.vs/claude-memory-plugin/tests/unit/scope/test-agent-sanitisation.spec.ts
- [X] T009 [P] [US1] Unit test for reserved agent name validation in /home/gareth/.vs/claude-memory-plugin/tests/unit/scope/test-reserved-names.spec.ts
- [X] T010 [P] [US2] Unit test for agent scope path resolution (project vs global) in /home/gareth/.vs/claude-memory-plugin/tests/unit/scope/test-agent-paths.spec.ts
- [X] T011 [P] [US2] Unit test for default scope selection with agent context in git repo in /home/gareth/.vs/claude-memory-plugin/tests/unit/scope/test-default-agent-scope.spec.ts
- [X] T012 [P] [US2] Unit test for default scope selection with agent context outside git in /home/gareth/.vs/claude-memory-plugin/tests/unit/scope/test-agent-scope-no-git.spec.ts
- [X] T013 [US2] Integration test for scope hierarchy resolution with agent context in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-agent-scope-hierarchy.spec.ts
- [X] T014 [US1] Integration test for AgentContext creation and validation in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-agent-context.spec.ts

### Implementation for Phase A

- [X] T015 [P] [US1] Add AgentProject and AgentGlobal to Scope enum in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/enums.ts
- [X] T016 [P] [US1] Create AgentContext interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/agent-context.ts
- [X] T017 [P] [US1] Create ScopeContext extension with agent field in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/scope-context.ts
- [X] T018 [P] [US1] Implement sanitiseAgentName utility in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/sanitise-agent-name.ts
- [X] T019 [P] [US1] Implement validateAgentName utility in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/validate-agent-name.ts
- [X] T020 [P] [US1] Create isAgentScope helper in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/is-agent-scope.ts
- [X] T021 [US2] Implement getAgentDirectoryPath utility in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/get-agent-directory-path.ts
- [X] T022 [US2] Extend ScopeResolver to accept optional agent parameter in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/resolver.ts
- [X] T023 [US2] Update getDefaultScope for agent context in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/resolver.ts
- [X] T024 [US2] Add agent scope path resolution logic to ScopeResolver in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/resolver.ts

**Checkpoint**: Scope system extended, agent name sanitisation operational, agent scope paths resolved correctly

---

## Phase B: Storage Infrastructure

**Goal**: Enable reading and writing agent-scoped memories

**Duration**: 3-4 days

**Maps to**: US1 (Agent Memory Storage), US2 (Scope Hierarchy)

### Tests for Phase B

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T025 [P] [US1] Unit test for agent field in frontmatter schema in /home/gareth/.vs/claude-memory-plugin/tests/unit/core/test-agent-frontmatter.spec.ts
- [ ] T026 [P] [US1] Unit test for frontmatter validation (agent field required for agent scopes) in /home/gareth/.vs/claude-memory-plugin/tests/unit/core/test-frontmatter-validation.spec.ts
- [ ] T027 [P] [US1] Unit test for agent directory auto-creation structure in /home/gareth/.vs/claude-memory-plugin/tests/unit/storage/test-agent-directory-creation.spec.ts
- [ ] T028 [P] [US1] Unit test for agent index operations (add, update, remove) in /home/gareth/.vs/claude-memory-plugin/tests/unit/storage/test-agent-index.spec.ts
- [ ] T029 [P] [US1] Unit test for agent graph initialisation in /home/gareth/.vs/claude-memory-plugin/tests/unit/storage/test-agent-graph-init.spec.ts
- [ ] T030 [P] [US2] Unit test for agent-scoped search filtering in /home/gareth/.vs/claude-memory-plugin/tests/unit/search/test-agent-search.spec.ts
- [ ] T031 [P] [US2] Unit test for agent-scoped semantic search isolation in /home/gareth/.vs/claude-memory-plugin/tests/unit/search/test-agent-semantic.spec.ts
- [ ] T032 [US1] Integration test for write agent memory to agent-project scope in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-write-agent-memory.spec.ts
- [ ] T033 [US1] Integration test for write agent memory to agent-global scope in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-write-agent-global.spec.ts
- [ ] T034 [US1] Integration test for read agent memory from agent scope in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-read-agent-memory.spec.ts
- [ ] T035 [US1] Integration test for delete agent memory with index cleanup in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-delete-agent-memory.spec.ts
- [ ] T036 [US2] Integration test for search within agent scope only in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-search-agent-scope.spec.ts
- [ ] T037 [US2] Integration test for search with --include-shared flag in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-search-include-shared.spec.ts

### Implementation for Phase B

- [ ] T038 [P] [US1] Extend MemoryFrontmatter interface with optional agent field in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/frontmatter.ts
- [ ] T039 [P] [US1] Create AgentMemoryFrontmatter interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/agent-frontmatter.ts
- [ ] T040 [P] [US1] Implement createAgentDirectory utility in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/storage/create-agent-directory.ts
- [ ] T041 [P] [US1] Implement agentDirectoryExists check in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/storage/agent-directory-exists.ts
- [ ] T042 [US1] Update frontmatter serialisation to include agent field in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/frontmatter.ts
- [ ] T043 [US1] Update frontmatter validation for agent scope requirements in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/frontmatter.ts
- [ ] T044 [US1] Extend index system to handle agent scope directories in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/index.ts
- [ ] T045 [US1] Update write operation to auto-create agent directories in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/write.ts
- [ ] T046 [US1] Update read operation to resolve agent scope paths in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/read.ts
- [ ] T047 [US1] Update delete operation to clean up agent indexes in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/delete.ts
- [ ] T048 [US2] Update search operation to filter by agent scope in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/search/search.ts
- [ ] T049 [US2] Update semantic search to use agent-specific embeddings in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/search/semantic.ts

**Checkpoint**: Agent-scoped storage operational, CRUD operations work with agent context, search scoped correctly

---

## Phase C: CLI Integration

**Goal**: All memory commands accept --agent flag

**Duration**: 3-4 days

**Maps to**: US3 (CLI Agent Targeting)

### Tests for Phase C

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T050 [P] [US3] Unit test for --agent flag parsing in CLI parser in /home/gareth/.vs/claude-memory-plugin/tests/unit/cli/test-agent-flag-parsing.spec.ts
- [ ] T051 [P] [US3] Unit test for --target-agent flag parsing in CLI parser in /home/gareth/.vs/claude-memory-plugin/tests/unit/cli/test-target-agent-flag.spec.ts
- [ ] T052 [P] [US3] Unit test for --include-shared flag parsing in CLI parser in /home/gareth/.vs/claude-memory-plugin/tests/unit/cli/test-include-shared-flag.spec.ts
- [ ] T053 [P] [US3] Unit test for --all-agents flag parsing in CLI parser in /home/gareth/.vs/claude-memory-plugin/tests/unit/cli/test-all-agents-flag.spec.ts
- [ ] T054 [P] [US3] Unit test for agent context propagation through command pipeline in /home/gareth/.vs/claude-memory-plugin/tests/unit/cli/test-agent-context-propagation.spec.ts
- [ ] T055 [US3] Integration test for memory write with --agent flag in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-cli-write-agent.spec.ts
- [ ] T056 [US3] Integration test for memory read with --agent flag in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-cli-read-agent.spec.ts
- [ ] T057 [US3] Integration test for memory list with --agent flag in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-cli-list-agent.spec.ts
- [ ] T058 [US3] Integration test for memory delete with --agent flag in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-cli-delete-agent.spec.ts
- [ ] T059 [US3] Integration test for memory search with --agent flag in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-cli-search-agent.spec.ts
- [ ] T060 [US3] Integration test for memory semantic with --agent flag in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-cli-semantic-agent.spec.ts
- [ ] T061 [US3] Integration test for backward compatibility (no --agent flag) in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-cli-backward-compat.spec.ts
- [ ] T062 [US3] Integration test for error messages with agent context in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-cli-agent-errors.spec.ts

### Implementation for Phase C

- [ ] T063 [P] [US3] Add --agent flag definition to CLI parser in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/parser.ts
- [ ] T064 [P] [US3] Add --target-agent flag definition to CLI parser in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/parser.ts
- [ ] T065 [P] [US3] Add --include-shared flag definition to CLI parser in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/parser.ts
- [ ] T066 [P] [US3] Add --all-agents flag definition to CLI parser in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/parser.ts
- [ ] T067 [P] [US3] Create ParsedArgsWithAgent interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/parsed-args-agent.ts
- [ ] T068 [US3] Update memory write command to accept and use --agent flag in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/write.ts
- [ ] T069 [US3] Update memory read command to accept and use --agent flag in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/read.ts
- [ ] T070 [US3] Update memory list command to accept and use --agent flag in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/list.ts
- [ ] T071 [US3] Update memory delete command to accept and use --agent flag in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/delete.ts
- [ ] T072 [US3] Update memory search command to accept --agent and --include-shared flags in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/search.ts
- [ ] T073 [US3] Update memory semantic command to accept --agent and --include-shared flags in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/semantic.ts
- [ ] T074 [US3] Update memory tag command to accept --agent flag in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/tag.ts
- [ ] T075 [US3] Update help text for all commands with --agent flag documentation in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/help.ts
- [ ] T076 [US3] Update error messages to include agent context when applicable in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/errors.ts

**Checkpoint**: All CLI commands support --agent flag, backward compatibility maintained, help text updated

---

## Phase D: Cross-Scope Graph Operations

**Goal**: Support linking memories across scope boundaries

**Duration**: 4-5 days

**Maps to**: US4 (Cross-Scope Memory Linking)

### Tests for Phase D

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T077 [P] [US4] Unit test for CrossScopeEdge interface with scope metadata in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-cross-scope-edge.spec.ts
- [ ] T078 [P] [US4] Unit test for cross-scope edge validation in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-edge-validation.spec.ts
- [ ] T079 [P] [US4] Unit test for bidirectional edge storage logic in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-bidirectional-storage.spec.ts
- [ ] T080 [P] [US4] Unit test for scope metadata serialisation in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-scope-metadata.spec.ts
- [ ] T081 [P] [US4] Unit test for cross-scope edge deletion cleanup in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-cross-scope-cleanup.spec.ts
- [ ] T082 [US4] Integration test for link agent memory to project memory in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-link-agent-to-project.spec.ts
- [ ] T083 [US4] Integration test for link project memory to agent memory in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-link-project-to-agent.spec.ts
- [ ] T084 [US4] Integration test for link between different agents (cross-agent) in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-link-cross-agent.spec.ts
- [ ] T085 [US4] Integration test for cross-scope edge deletion with cleanup in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-delete-cross-scope-edge.spec.ts
- [ ] T086 [US4] Integration test for memory deletion with cross-scope link cleanup in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-delete-with-cross-links.spec.ts
- [ ] T087 [US4] Integration test for impact analysis across scope boundaries in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-cross-scope-impact.spec.ts
- [ ] T088 [US4] Integration test for orphan detection with cross-scope links in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-orphan-cross-scope.spec.ts

### Implementation for Phase D

- [ ] T089 [P] [US4] Create CrossScopeEdge interface extending GraphEdge in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/cross-scope-edge.ts
- [ ] T090 [P] [US4] Create AgentAwareGraph interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/agent-aware-graph.ts
- [ ] T091 [P] [US4] Implement validateCrossScopeEdge utility in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/validate-cross-scope-edge.ts
- [ ] T092 [P] [US4] Implement buildMemoryReference utility in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/build-memory-reference.ts
- [ ] T093 [P] [US4] Implement extractAgentFromMemoryId utility in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/extract-agent-from-id.ts
- [ ] T094 [US4] Extend graph edge creation to support cross-scope metadata in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/create-edge.ts
- [ ] T095 [US4] Implement bidirectional cross-scope edge storage in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/store-cross-scope-edge.ts
- [ ] T096 [US4] Update edge deletion to clean up both scopes in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/delete-edge.ts
- [ ] T097 [US4] Update memory deletion to clean up cross-scope links in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/delete.ts
- [ ] T098 [US4] Update impact analysis to traverse scope boundaries in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/impact.ts
- [ ] T099 [US4] Update orphan detection to respect cross-scope links in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/orphans.ts
- [ ] T100 [US4] Update memory link command to support --agent and --target-agent in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/link.ts
- [ ] T101 [US4] Update memory unlink command to support --agent and --target-agent in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/unlink.ts
- [ ] T102 [US4] Update memory edges command to display scope indicators in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/edges.ts

**Checkpoint**: Cross-scope linking operational, bidirectional storage working, cleanup on deletion verified

---

## Phase E: Advanced Features

**Goal**: Graph visualisation, agent listing, and quality checks

**Duration**: 2-3 days

**Maps to**: US5 (Agent-Specific Graph Integration)

### Tests for Phase E

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T103 [P] [US5] Unit test for scope indicator formatting in /home/gareth/.vs/claude-memory-plugin/tests/unit/display/test-scope-indicators.spec.ts
- [ ] T104 [P] [US5] Unit test for agent node visual styling in Mermaid in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-agent-mermaid-style.spec.ts
- [ ] T105 [P] [US5] Unit test for AgentInfo structure and validation in /home/gareth/.vs/claude-memory-plugin/tests/unit/agents/test-agent-info.spec.ts
- [ ] T106 [P] [US5] Unit test for agent directory scanning in /home/gareth/.vs/claude-memory-plugin/tests/unit/agents/test-scan-agents.spec.ts
- [ ] T107 [US5] Integration test for memory mermaid with --agent flag in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-mermaid-agent.spec.ts
- [ ] T108 [US5] Integration test for memory mermaid with --agent --include-shared in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-mermaid-agent-shared.spec.ts
- [ ] T109 [US5] Integration test for memory stats with --agent flag in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-stats-agent.spec.ts
- [ ] T110 [US5] Integration test for memory health with --agent flag in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-health-agent.spec.ts
- [ ] T111 [US5] Integration test for memory agents command listing all agents in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-agents-command.spec.ts
- [ ] T112 [US5] Integration test for suggest-links with agent scope in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-suggest-links-agent.spec.ts

### Implementation for Phase E

- [ ] T113 [P] [US5] Implement formatScopeIndicator utility in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/display/format-scope-indicator.ts
- [ ] T114 [P] [US5] Create AgentInfo interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/agent-info.ts
- [ ] T115 [P] [US5] Create ListAgentsResponse interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/list-agents-response.ts
- [ ] T116 [P] [US5] Implement scanAgentDirectories utility in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/agents/scan-agent-directories.ts
- [ ] T117 [P] [US5] Implement getAgentInfo utility in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/agents/get-agent-info.ts
- [ ] T118 [US5] Update Mermaid generation to accept agent context in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/mermaid.ts
- [ ] T119 [US5] Add visual styling for agent nodes in Mermaid diagrams in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/mermaid.ts
- [ ] T120 [US5] Update graph stats to support agent scope filtering in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/stats.ts
- [ ] T121 [US5] Update health checks to validate agent scope integrity in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/health.ts
- [ ] T122 [US5] Create memory agents command implementation in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/agents.ts
- [ ] T123 [US5] Update memory mermaid command to accept --agent and --include-shared in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/mermaid.ts
- [ ] T124 [US5] Update memory stats command to accept --agent flag in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/stats.ts
- [ ] T125 [US5] Update memory health command to accept --agent flag in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/health.ts
- [ ] T126 [US5] Update suggest-links to work within agent scope in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/suggest-links.ts

**Checkpoint**: Agent visualisation operational, memory agents command working, health checks validate agent scopes

---

## Phase F: Context Injection Preparation

**Goal**: Prepare infrastructure for automatic agent context injection

**Duration**: 1 day

**Maps to**: US6 (Agent Memory Context Injection)

### Documentation for Phase F

- [ ] T127 [P] [US6] Document agent identity detection options in plan/research.md
- [ ] T128 [P] [US6] Document agent invocation marker format in plan/research.md
- [ ] T129 [P] [US6] Document hook integration requirements for agent context in plan/research.md
- [ ] T130 [US6] Add agent context parameter placeholder to hook interfaces in /home/gareth/.vs/claude-memory-plugin/hooks/src/types/hook-context.ts
- [ ] T131 [US6] Document future agent context injection workflow in /home/gareth/.vs/claude-memory-plugin/hooks/README.md

**Checkpoint**: Agent context injection infrastructure documented, placeholder for future implementation ready

---

## Phase G: Integration & Documentation

**Goal**: Complete integration testing, performance validation, documentation updates

**Duration**: 3-4 days

**Maps to**: All user stories

### Integration & Validation Tasks

- [ ] T132 [P] Integration test for full workflow agent write → read → link → delete in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-full-agent-workflow.spec.ts
- [ ] T133 [P] Integration test for backward compatibility (existing commands unchanged) in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-backward-compat-v1.3.spec.ts
- [ ] T134 [P] Integration test for agent scope hierarchy fallback behaviour in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-scope-hierarchy-fallback.spec.ts
- [ ] T135 [P] Integration test for agent directory auto-creation on first write in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-agent-directory-auto-create.spec.ts
- [ ] T136 [P] Integration test for cross-scope link bidirectional integrity in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-cross-scope-integrity.spec.ts
- [ ] T137 [US1] Performance test for agent-scoped CRUD operations <100ms in /home/gareth/.vs/claude-memory-plugin/tests/performance/test-agent-crud-speed.spec.ts
- [ ] T138 [US4] Performance test for cross-scope graph operations <500ms in /home/gareth/.vs/claude-memory-plugin/tests/performance/test-cross-scope-speed.spec.ts
- [ ] T139 [US5] Performance test for agent listing with many agents <200ms in /home/gareth/.vs/claude-memory-plugin/tests/performance/test-list-agents-speed.spec.ts

### Documentation Tasks

- [ ] T140 [P] Update README.md with agent-scoped memory documentation in /home/gareth/.vs/claude-memory-plugin/README.md
- [ ] T141 [P] Update README.md with --agent flag examples for all commands in /home/gareth/.vs/claude-memory-plugin/README.md
- [ ] T142 [P] Update SKILL.md for memory skill with agent scope features in /home/gareth/.vs/claude-memory-plugin/skills/memory/SKILL.md
- [ ] T143 [P] Update memory.example.md with agent scope examples in /home/gareth/.vs/claude-memory-plugin/.claude/memory.example.md
- [ ] T144 [P] Create agent-scoped-memories.md guide in /home/gareth/.vs/claude-memory-plugin/docs/agent-scoped-memories.md
- [ ] T145 Create CHANGELOG.md entry for v1.3.0 in /home/gareth/.vs/claude-memory-plugin/CHANGELOG.md
- [ ] T146 Update quickstart.md with validation scenarios for all user stories in /home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/003-agent-scoped-memories/quickstart.md
- [ ] T147 Validate all 6 user stories against acceptance criteria from spec.md
- [ ] T148 Run full test suite and verify all tests pass
- [ ] T149 Update package.json version to 1.3.0 in /home/gareth/.vs/claude-memory-plugin/package.json

**Checkpoint**: All features tested, documented, validated against acceptance criteria, ready for merge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Research Validation)**: No dependencies - start immediately
- **Phase A (Foundation)**: Depends on Phase 0 completion
- **Phase B (Storage Infrastructure)**: Depends on Phase A completion
- **Phase C (CLI Integration)**: Depends on Phase B completion
- **Phase D (Cross-Scope Graph)**: Depends on Phase B and C completion
- **Phase E (Advanced Features)**: Depends on Phase D completion
- **Phase F (Context Injection Prep)**: Independent (documentation only)
- **Phase G (Integration)**: Depends on Phase A-E completion

### User Story Dependencies

- **US1 (Agent Memory Storage)**: No dependencies on other stories
- **US2 (Scope Hierarchy)**: No dependencies on other stories
- **US3 (CLI Integration)**: Depends on US1 and US2 (needs storage layer)
- **US4 (Cross-Scope Linking)**: Depends on US1, US2, US3 (needs graph operations)
- **US5 (Graph Integration)**: Depends on US4 (needs cross-scope links)
- **US6 (Context Injection)**: Documentation only, future implementation

### Within Each Phase

1. **ALL Tests first** - Write and run ALL tests in the "Tests for Phase X" subsection
2. **Verify ALL fail** - Confirm each test fails for the expected reason (Red phase)
3. **ALL Implementation** - Proceed to "Implementation for Phase X" subsection
4. **Verify tests pass** - Each implementation should make corresponding test(s) pass (Green phase)
5. **Refactor** - Clean up while maintaining passing tests (Refactor phase)

### Parallel Opportunities

- Phase 0: T002-T006 can run in parallel (independent verifications)
- Phase A Tests: T007-T012 can run in parallel (different test files)
- Phase A Implementation: T015-T020 can run in parallel (different files)
- Phase B Tests: T025-T031 can run in parallel (different test files)
- Phase B Implementation: T038-T041 can run in parallel (different files)
- Phase C Tests: T050-T054 can run in parallel (different test files)
- Phase C Implementation: T063-T067 can run in parallel (different files)
- Phase D Tests: T077-T081 can run in parallel (different test files)
- Phase D Implementation: T089-T093 can run in parallel (different files)
- Phase E Tests: T103-T106 can run in parallel (different test files)
- Phase E Implementation: T113-T117 can run in parallel (different files)
- Phase F: T127-T129 can run in parallel (documentation tasks)
- Phase G: T132-T136, T137-T139, T140-T144 can run in parallel (independent tasks)

**Note**: Phases must complete sequentially due to dependencies, but tasks within phases can often be parallelised.

---

## Implementation Strategy

### MVP First (Phase 0-C Only)

1. Complete Phase 0: Research Validation
2. Complete Phase A: Foundation
3. Complete Phase B: Storage Infrastructure
4. Complete Phase C: CLI Integration
5. **STOP and VALIDATE**: Test US1, US2, US3 independently
6. Deploy/demo basic agent-scoped memory operations

### Incremental Delivery

1. Phase 0-C → Agent-scoped storage and CLI operational (US1, US2, US3)
2. Add Phase D → Cross-scope linking operational (US4)
3. Add Phase E → Advanced graph features operational (US5)
4. Phase F → Context injection documented (US6 prep)
5. Phase G → Complete integration and documentation

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 0 together
2. Phase A → Team works together (small phase, foundational)
3. Once Phase B done:
   - Developer A: Phase C (CLI Integration)
   - Developer B: Start Phase D preparation (design cross-scope edge logic)
4. Phase D → Team works together (high complexity, cross-scope linking)
5. Once Phase D done:
   - Developer A: Phase E (Advanced Features)
   - Developer B: Phase F (Documentation)
6. All converge on Phase G (Integration)

---

## Validation Checklist

Before finalising tasks.md, verify:

- [x] All template sample tasks removed
- [x] Each phase has "### Tests for Phase X" subsection
- [x] Each phase has "### Implementation for Phase X" subsection
- [x] Tests subsection comes BEFORE Implementation subsection in EVERY phase
- [x] NO interleaved test/implementation tasks
- [x] All tasks use absolute file paths
- [x] Parallelisable tasks marked with [P]
- [x] Story-specific tasks tagged with [USX]
- [x] Checkpoints included for each phase
- [x] YAML frontmatter updated with phase mappings

---

## Notes

- Tasks marked [P] can run in parallel (different files, no dependencies)
- Tasks marked [USX] map to specific user story for traceability
- Each user story is independently completable and testable
- Verify ALL tests fail before ANY implementation begins (critical for TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- Total tasks: 149 (tests: 78, implementation: 63, documentation: 8)
- Estimated duration: 15-20 days (solo, full-time)
- Cross-scope linking (Phase D) is highest complexity area - allocate extra time
- Agent name sanitisation must handle edge cases (Unicode, special chars, reserved names)
- Bidirectional edge storage is critical - extensive testing required
