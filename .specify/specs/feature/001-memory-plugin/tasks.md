---
# YAML Frontmatter for spec-lint
description: "Executable task list for Claude Code Memory Plugin implementation"
phases:
  - id: 0
    name: "Phase 0: Research & Setup"
    maps_to: []
  - id: 1
    name: "Phase 1: Core CRUD Operations"
    maps_to: ["US1"]
  - id: 2
    name: "Phase 2: 4-Tier Scope Resolution"
    maps_to: ["US6"]
  - id: 3
    name: "Phase 3: Semantic Search & Embeddings"
    maps_to: ["US2"]
  - id: 4
    name: "Phase 4: Graph Operations"
    maps_to: ["US3"]
  - id: 5
    name: "Phase 5: Hooks & Contextual Injection"
    maps_to: ["US4"]
  - id: 6
    name: "Phase 6: Health, Quality & Commands"
    maps_to: ["US5"]
  - id: 7
    name: "Phase 7: Plugin Packaging & Distribution"
    maps_to: []
---

# Tasks: Claude Code Memory Plugin

**Feature**: 001-memory-plugin
**Input**: Design documents from `/home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/001-memory-plugin/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/memory-skill-api.md

**TDD Workflow**: All implementation tasks follow Red-Green-Refactor cycle (see `.specify/tdd-checklist.md`)

**Organisation**: Tasks grouped by user story priority (P1 → P2 → P3) for independent implementation and testing.

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

## Phase 0: Research & Setup

**Purpose**: Project initialisation, TypeScript scaffolding, test framework setup

**Duration**: 1-2 days

- [X] T001 Review research.md findings and validate technical decisions
- [X] T002 Initialise TypeScript project with package.json in /home/gareth/.vs/claude-memory-plugin/
- [X] T003 [P] Configure tsconfig.json for TypeScript compilation
- [X] T004 [P] Install Vitest test framework and configure vitest.config.ts
- [X] T005 [P] Install tsx for development (direct TypeScript execution)
- [X] T006 [P] Create directory structure: skills/memory/src/{core,graph,search,quality,scope,types}
- [X] T007 [P] Create directory structure: hooks/{lib,pre-tool-use,post-tool-use,user-prompt-submit,session-start,session-end,pre-compact}
- [X] T008 [P] Create directory structure: commands/, agents/, .claude-plugin/
- [X] T009 Create .gitignore (node_modules/, lib/, .embedding-cache/, dist/)
- [X] T010 Document fork session architecture decision in /home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/001-memory-plugin/research.md

**Checkpoint**: TypeScript project ready, test framework operational, directory structure created

---

## Phase 1: Core CRUD Operations (US1 - Priority P1)

**Goal**: Implement foundational memory storage and retrieval operations

**Duration**: 3-5 days

**Independent Test**: Create memory with `memory write`, read with `memory read`, list with `memory list`, delete with `memory delete`

### Tests for User Story 1

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T011 [P] [US1] Unit test for slug generation in /home/gareth/.vs/claude-memory-plugin/tests/unit/core/test-slug.spec.ts
- [X] T012 [P] [US1] Unit test for YAML frontmatter parser in /home/gareth/.vs/claude-memory-plugin/tests/unit/core/test-frontmatter.spec.ts
- [X] T013 [P] [US1] Unit test for Memory entity validation in /home/gareth/.vs/claude-memory-plugin/tests/unit/types/test-memory.spec.ts
- [X] T014 [P] [US1] Unit test for Index cache operations in /home/gareth/.vs/claude-memory-plugin/tests/unit/core/test-index.spec.ts
- [X] T015 [P] [US1] Contract test for WriteMemoryRequest/Response in /home/gareth/.vs/claude-memory-plugin/tests/contract/test-write.spec.ts
- [X] T016 [P] [US1] Contract test for ReadMemoryRequest/Response in /home/gareth/.vs/claude-memory-plugin/tests/contract/test-read.spec.ts
- [X] T017 [P] [US1] Contract test for ListMemoriesRequest/Response in /home/gareth/.vs/claude-memory-plugin/tests/contract/test-list.spec.ts
- [X] T018 [P] [US1] Contract test for DeleteMemoryRequest/Response in /home/gareth/.vs/claude-memory-plugin/tests/contract/test-delete.spec.ts
- [X] T019 [P] [US1] Contract test for SearchMemoriesRequest/Response in /home/gareth/.vs/claude-memory-plugin/tests/contract/test-search.spec.ts
- [X] T020 [US1] Integration test for full CRUD cycle in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-crud-lifecycle.spec.ts
- [X] T021 [US1] Integration test for index rebuild from filesystem in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-index-rebuild.spec.ts

### Implementation for User Story 1

- [X] T022 [P] [US1] Define TypeScript interfaces in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/memory.ts
- [X] T023 [P] [US1] Define MemoryType and Scope enums in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/enums.ts
- [X] T024 [P] [US1] Implement slug generation with collision detection in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/slug.ts
- [X] T025 [P] [US1] Implement YAML frontmatter parser and serialiser in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/frontmatter.ts
- [X] T026 [P] [US1] Implement file system utilities (atomic write, read, delete) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/fs-utils.ts
- [X] T027 [P] [US1] Implement Index entity and cache operations in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/index.ts
- [X] T028 [US1] Implement memory write operation in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/write.ts (depends on T024, T025, T026, T027)
- [X] T029 [US1] Implement memory read operation in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/read.ts (depends on T025, T027)
- [X] T030 [US1] Implement memory list operation with filters in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/list.ts (depends on T027)
- [X] T031 [US1] Implement keyword search in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/search.ts (depends on T027)
- [X] T032 [US1] Implement memory delete operation with cleanup in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/delete.ts (depends on T027)
- [X] T033 [US1] Add validation for Memory entity fields in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/validation.ts
- [X] T034 [US1] Add logging for CRUD operations in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/logger.ts

**Checkpoint**: User Story 1 fully functional - memories can be created, read, listed, searched, and deleted with index caching

---

## Phase 2: 4-Tier Scope Resolution (US6 - Priority P1)

**Goal**: Implement multi-scope storage with hierarchy resolution (enterprise → local → project → global)

**Duration**: 2-3 days

**Independent Test**: Create memories at different scopes, verify isolation and hierarchy resolution

### Tests for User Story 6

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T035 [P] [US6] Unit test for scope detection logic in /home/gareth/.vs/claude-memory-plugin/tests/unit/scope/test-resolver.spec.ts
- [X] T036 [P] [US6] Unit test for config.json parsing in /home/gareth/.vs/claude-memory-plugin/tests/unit/scope/test-config.spec.ts
- [X] T037 [P] [US6] Unit test for gitignore automation in /home/gareth/.vs/claude-memory-plugin/tests/unit/scope/test-gitignore.spec.ts
- [X] T038 [P] [US6] Contract test for scope parameter in all CRUD operations in /home/gareth/.vs/claude-memory-plugin/tests/contract/test-scope-parameters.spec.ts
- [X] T039 [US6] Integration test for global scope storage in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-global-scope.spec.ts
- [X] T040 [US6] Integration test for project scope storage in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-project-scope.spec.ts
- [X] T041 [US6] Integration test for local scope storage and gitignore in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-local-scope.spec.ts
- [X] T042 [US6] Integration test for enterprise scope (enabled and disabled) in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-enterprise-scope.spec.ts
- [X] T043 [US6] Integration test for scope hierarchy resolution in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-scope-hierarchy.spec.ts
- [X] T044 [US6] Integration test for scope isolation (no cross-scope leakage) in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-scope-isolation.spec.ts

### Implementation for User Story 6

- [X] T045 [P] [US6] Implement git repository detection in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/git-utils.ts
- [X] T046 [P] [US6] Implement config.json reader and validator in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/config.ts
- [X] T047 [P] [US6] Implement managed-settings.json reader for enterprise path in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/enterprise.ts
- [X] T048 [US6] Implement scope resolver with hierarchy logic in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/resolver.ts (depends on T045, T046, T047)
- [X] T049 [US6] Implement default scope selection logic in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/defaults.ts (depends on T045)
- [X] T050 [US6] Implement gitignore automation for local scope in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/scope/gitignore.ts
- [X] T051 [US6] Refactor write.ts to accept scope parameter and use resolver (depends on T028, T048)
- [X] T052 [US6] Refactor read.ts to search across scopes (depends on T029, T048)
- [X] T053 [US6] Refactor list.ts to merge results from multiple scopes (depends on T030, T048)
- [X] T054 [US6] Refactor search.ts to search across scopes (depends on T031, T048)
- [X] T055 [US6] Refactor delete.ts to handle scoped deletion (depends on T032, T048)
- [X] T056 [US6] Add scope indicators to output formatting in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/formatters.ts

**Checkpoint**: 4-tier scope system operational - memories correctly isolated and merged across scopes

---

## Phase 3: Semantic Search & Embeddings (US2 - Priority P2)

**Goal**: Implement semantic search with Ollama embeddings and graceful degradation

**Duration**: 3-4 days

**Independent Test**: Create memories with related concepts, search semantically, verify conceptual matches

### Tests for User Story 2

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T057 [P] [US2] Unit test for Ollama availability detection in /home/gareth/.vs/claude-memory-plugin/tests/unit/search/test-ollama-detect.spec.ts
- [X] T058 [P] [US2] Unit test for embedding generation in /home/gareth/.vs/claude-memory-plugin/tests/unit/search/test-embeddings.spec.ts
- [X] T059 [P] [US2] Unit test for cosine similarity calculation in /home/gareth/.vs/claude-memory-plugin/tests/unit/search/test-similarity.spec.ts
- [X] T060 [P] [US2] Unit test for embedding cache operations in /home/gareth/.vs/claude-memory-plugin/tests/unit/search/test-embedding-cache.spec.ts
- [X] T061 [P] [US2] Contract test for SemanticSearchRequest/Response in /home/gareth/.vs/claude-memory-plugin/tests/contract/test-semantic-search.spec.ts
- [X] T062 [US2] Integration test for semantic search with Ollama available in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-semantic-search-available.spec.ts
- [X] T063 [US2] Integration test for graceful degradation when Ollama unavailable in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-semantic-fallback.spec.ts
- [X] T064 [US2] Integration test for embedding cache lifecycle in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-embedding-cache-lifecycle.spec.ts
- [X] T065 [US2] Integration test for configurable embedding models in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-embedding-config.spec.ts

### Implementation for User Story 2

- [X] T066 [P] [US2] Implement Ollama HTTP client in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/search/ollama.ts
- [X] T067 [P] [US2] Implement embedding generation with fallback models in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/search/embeddings.ts
- [X] T068 [P] [US2] Implement cosine similarity calculation in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/search/similarity.ts
- [X] T069 [P] [US2] Implement embedding cache entity and operations in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/search/embedding-cache.ts
- [X] T070 [P] [US2] Implement content hashing for staleness detection in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/search/hash.ts
- [X] T071 [US2] Implement semantic search operation in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/search/semantic.ts (depends on T066, T067, T068, T069)
- [X] T072 [US2] Implement Ollama availability detection with caching in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/search/detect.ts (depends on T066)
- [X] T073 [US2] Implement actionable error messages for Ollama setup in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/search/errors.ts
- [X] T074 [US2] Add embedding computation hook to write.ts (depends on T028, T067, T069)
- [X] T075 [US2] Add embedding cache invalidation to delete.ts (depends on T032, T069)
- [X] T076 [US2] Implement embedding config reader with project/global precedence in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/search/config.ts

**Checkpoint**: Semantic search operational with Ollama, graceful fallback to keyword search when unavailable

---

## Phase 4: Graph Operations (US3 - Priority P2)

**Goal**: Implement bidirectional memory linking with graph visualisation

**Duration**: 3-4 days

**Independent Test**: Link memories, list edges, generate Mermaid diagrams, verify cleanup on deletion

### Tests for User Story 3

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T077 [P] [US3] Unit test for graph adjacency list structure in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-structure.spec.ts
- [X] T078 [P] [US3] Unit test for bidirectional edge creation in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-edge-creation.spec.ts
- [X] T079 [P] [US3] Unit test for edge label conventions in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-labels.spec.ts
- [X] T080 [P] [US3] Unit test for Mermaid diagram generation in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-visualise.spec.ts
- [X] T081 [P] [US3] Contract test for LinkMemoriesRequest/Response in /home/gareth/.vs/claude-memory-plugin/tests/contract/test-link.spec.ts
- [X] T082 [P] [US3] Contract test for ListEdgesRequest/Response in /home/gareth/.vs/claude-memory-plugin/tests/contract/test-edges.spec.ts
- [X] T083 [P] [US3] Contract test for VisualiseGraphRequest/Response in /home/gareth/.vs/claude-memory-plugin/tests/contract/test-graph-visualise.spec.ts
- [X] T084 [US3] Integration test for link creation and retrieval in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-link-lifecycle.spec.ts
- [X] T085 [US3] Integration test for edge cleanup on memory deletion in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-edge-cleanup.spec.ts
- [X] T086 [US3] Integration test for graph traversal and visualisation in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-graph-traversal.spec.ts
- [X] T087 [US3] Integration test for graph.json consistency validation in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-graph-validation.spec.ts

### Implementation for User Story 3

- [X] T088 [P] [US3] Define Graph and Edge interfaces in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/graph.ts
- [X] T089 [P] [US3] Implement graph.json reader and writer in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/storage.ts
- [X] T090 [P] [US3] Implement edge label reverse mapping logic in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/labels.ts
- [X] T091 [P] [US3] Implement graph traversal (BFS/DFS) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/traverse.ts
- [X] T092 [US3] Implement bidirectional link creation in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link.ts (depends on T088, T089, T090)
- [X] T093 [US3] Implement unlink operation in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/unlink.ts (depends on T089)
- [X] T094 [US3] Implement edge listing for memory in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/edges.ts (depends on T089)
- [X] T095 [US3] Implement Mermaid diagram generation in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/visualise.ts (depends on T089, T091)
- [X] T096 [US3] Implement link suggestions using semantic similarity in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/suggest.ts (depends on T067, T068, T089)
- [X] T097 [US3] Add graph edge cleanup to delete.ts (depends on T032, T089)
- [X] T098 [US3] Update memory frontmatter with links on link/unlink operations (depends on T025, T092, T093)
- [X] T099 [US3] Implement graph validation and repair utilities in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/validate.ts

**Checkpoint**: Graph operations functional - memories can be linked, edges listed, graphs visualised

---

## Phase 5: Hooks & Contextual Injection (US4 - Priority P3)

**Goal**: Implement hooks for gotcha injection and session management

**Duration**: 4-5 days

**Independent Test**: Create gotcha memories, read matching files, verify warnings appear without duplication

### Tests for User Story 4

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T100 [P] [US4] Unit test for file pattern matching logic in hooks/src/memory/pattern-matcher.spec.ts
- [X] T101 [P] [US4] Unit test for tag-based relevance scoring in hooks/src/memory/relevance-scorer.spec.ts
- [X] T102 [P] [US4] Unit test for session deduplication state in hooks/src/session/session-state.spec.ts
- [X] T103 [P] [US4] Unit test for hook error handling in hooks/src/core/error-handler.spec.ts
- [X] T104 [US4] Integration test for gotcha injection on file read in hooks/src/memory/gotcha-injector.spec.ts
- [X] T105 [US4] Integration test for session deduplication in hooks/src/session/session-cache.spec.ts
- [X] T106 [US4] Integration test for hook performance (<50ms latency) - covered in subprocess.spec.ts
- [X] T107 [US4] Integration test for memory directory protection in hooks/pre-tool-use/protect-memory-directory.spec.ts

### Implementation for User Story 4

- [X] T108 [P] [US4] Implement shared error handler utilities in hooks/src/core/error-handler.ts
- [X] T109 [P] [US4] Implement session state manager in hooks/src/session/session-state.ts
- [X] T110 [P] [US4] Implement file pattern matcher in hooks/src/memory/pattern-matcher.ts
- [X] T111 [P] [US4] Implement relevance scorer (tag + semantic) in hooks/src/memory/relevance-scorer.ts
- [X] T112 [US4] Implement protect-memory-directory hook (PreToolUse) in hooks/pre-tool-use/protect-memory-directory.ts
- [X] T113 [US4] Implement memory-context hook (PostToolUse Read) in hooks/post-tool-use/memory-context.ts
- [X] T114 [US4] Implement memory-context hook (PostToolUse) - combined into memory-context.ts (handles Read/Write/Edit)
- [X] T115 [US4] Implement session cache for deduplication in hooks/src/session/session-cache.ts
- [X] T116 [US4] Implement start-memory-index hook (SessionStart) in hooks/session-start/start-memory-index.ts
- [X] T117 [US4] Implement memory-skill-reminder hook (UserPromptSubmit) in hooks/user-prompt-submit/memory-skill-reminder.ts
- [X] T118 [US4] Implement memory-think-reminder hook (UserPromptSubmit) in hooks/user-prompt-submit/memory-think-reminder.ts
- [X] T119 [US4] Implement pre-compact-memory hook (PreCompact) in hooks/pre-compact/memory-capture.ts
- [X] T120 [US4] Implement end-memory hook (SessionEnd) in hooks/session-end/memory-cleanup.ts
- [X] T121 [US4] Create hooks.json configuration file in hooks/hooks.json
- [X] T122 [US4] Implement fork session detection logic in hooks/src/session/fork-detection.ts

**Checkpoint**: Hooks operational - gotchas injected contextually, session state managed, memory directory protected

---

## Phase 6: Health, Quality & Commands (US5 - Priority P3)

**Goal**: Implement health monitoring, quality scoring, slash commands, and agents

**Duration**: 3-4 days

**Independent Test**: Run health check, identify issues, repair automatically, score memory quality

### Tests for User Story 5

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T123 [P] [US5] Unit test for orphan detection logic in /home/gareth/.vs/claude-memory-plugin/tests/unit/quality/test-orphan-detection.spec.ts
- [X] T124 [P] [US5] Unit test for broken link detection in /home/gareth/.vs/claude-memory-plugin/tests/unit/quality/test-broken-links.spec.ts
- [X] T125 [P] [US5] Unit test for frontmatter validation in /home/gareth/.vs/claude-memory-plugin/tests/unit/quality/test-frontmatter-validation.spec.ts
- [X] T126 [P] [US5] Unit test for quality scoring algorithm in /home/gareth/.vs/claude-memory-plugin/tests/unit/quality/test-scoring.spec.ts
- [X] T127 [P] [US5] Contract test for HealthCheckRequest/Response in /home/gareth/.vs/claude-memory-plugin/tests/contract/test-health-check.spec.ts
- [X] T128 [P] [US5] Contract test for QualityScoreRequest/Response in /home/gareth/.vs/claude-memory-plugin/tests/contract/test-quality-score.spec.ts
- [X] T129 [P] [US5] Contract test for RepairRequest/Response in /home/gareth/.vs/claude-memory-plugin/tests/contract/test-repair.spec.ts
- [X] T130 [US5] Integration test for health check with synthetic issues in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-health-check-full.spec.ts
- [X] T131 [US5] Integration test for automated repair in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-automated-repair.spec.ts
- [X] T132 [US5] Integration test for quality scoring across memory types in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-quality-scoring.spec.ts

### Implementation for User Story 5

- [X] T133 [P] [US5] Implement orphan detection (memories without hub links) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/quality/orphans.ts
- [X] T134 [P] [US5] Implement broken link detection in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/quality/broken-links.ts
- [X] T135 [P] [US5] Implement frontmatter validation rules in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/quality/frontmatter-validation.ts
- [X] T136 [P] [US5] Implement embedding cache health checks in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/quality/cache-health.ts
- [X] T137 [P] [US5] Implement quality scoring algorithm in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/quality/scoring.ts
- [X] T138 [US5] Implement health check orchestrator in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/quality/health.ts (depends on T133, T134, T135, T136)
- [X] T139 [US5] Implement repair operations (remove broken links, rebuild index) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/quality/repair.ts (depends on T134)
- [X] T140 [US5] Implement health report formatter in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/quality/report-formatter.ts
- [X] T141 [US5] Create /memory:check-health command in /home/gareth/.vs/claude-memory-plugin/commands/check-health.md (depends on T138)
- [X] T142 [US5] Create /memory:check-gotchas command in /home/gareth/.vs/claude-memory-plugin/commands/check-gotchas.md (depends on T111)
- [X] T143 [US5] Create /memory:commit command with auto-hub generation in /home/gareth/.vs/claude-memory-plugin/commands/commit.md (depends on T028, T092)
- [~] T144 [US5] ~~Create /memory command for quick operations~~ REMOVED: Superseded by `memory` CLI (via bun link)
- [X] T145 [US5] Create memory:recall agent in /home/gareth/.vs/claude-memory-plugin/agents/recall.md (depends on T071)
- [X] T146 [US5] Create memory:curator agent in /home/gareth/.vs/claude-memory-plugin/agents/curator.md (depends on T138, T139)

**Checkpoint**: Health monitoring operational, quality scoring functional, commands and agents created

---

## Phase 7: Plugin Packaging & Distribution

**Goal**: Package plugin for distribution, validate backward compatibility, document installation

**Duration**: 2-3 days

**Independent Test**: Install plugin via `/plugin install`, verify all components load correctly

### Tests for Phase 7

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [X] T147 [P] Unit test for plugin.json schema validation in /home/gareth/.vs/claude-memory-plugin/tests/unit/plugin/test-plugin-metadata.spec.ts
- [X] T148 [P] Integration test for backward compatibility with bash memories in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-backward-compat.spec.ts
- [X] T149 [P] Integration test for plugin installation process in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-plugin-install.spec.ts
- [X] T150 Integration test for all components registration in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-component-registration.spec.ts

### Implementation for Phase 7

- [X] T151 [P] Create plugin.json with metadata in /home/gareth/.vs/claude-memory-plugin/.claude-plugin/plugin.json
- [X] T152 [P] Configure build scripts in package.json (build, test, lint, format)
- [X] T153 [P] Create TypeScript compilation configuration for production in /home/gareth/.vs/claude-memory-plugin/tsconfig.build.json
- [X] T154 [P] Create README.md with installation and usage documentation in /home/gareth/.vs/claude-memory-plugin/README.md
- [X] T155 [P] Create SKILL.md for memory skill in /home/gareth/.vs/claude-memory-plugin/skills/memory/SKILL.md
- [~] T156 [P] ~~Document fork session architecture options in README.md~~ DEFERRED: Session continuity moved to separate plugin
- [X] T157 Build plugin with tsc and verify lib/ output (uses bun build for Bun-native .ts imports)
- [X] T158 Test backward compatibility with existing ~/.claude/memory/ files (191 user memories accessible)
- [X] T159 Validate all hooks register correctly via hooks.json
- [X] T160 Validate all commands are discoverable
- [X] T161 Validate all agents are discoverable
- [X] T162 Create CHANGELOG.md with version 1.0.0 entry in /home/gareth/.vs/claude-memory-plugin/CHANGELOG.md
- [X] T163 Create quickstart.md validation script in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-quickstart-validation.spec.ts
- [X] T164 Run full test suite and verify 100% pass rate (2700 tests pass)
- [X] T165 Performance benchmark: CRUD operations <100ms, graph operations <500ms (Read: 61ms, List: 61ms, Search: 69ms, Stats: 60ms)
- [~] T166 Performance benchmark: Gotcha injection <50ms latency - DOCUMENTED: ~500ms due to Bun TypeScript compilation per invocation; optimisation deferred

**Checkpoint**: Plugin packaged, tested, documented, and ready for distribution

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Setup)**: No dependencies - start immediately
- **Phase 1 (Core CRUD)**: Depends on Phase 0 completion
- **Phase 2 (Scope Resolution)**: Depends on Phase 1 completion
- **Phase 3 (Semantic Search)**: Depends on Phase 1, Phase 2 completion
- **Phase 4 (Graph Operations)**: Depends on Phase 1, Phase 2 completion
- **Phase 5 (Hooks)**: Depends on Phase 1, Phase 2, Phase 3 completion
- **Phase 6 (Health & Quality)**: Depends on Phase 1-4 completion
- **Phase 7 (Packaging)**: Depends on Phase 1-6 completion

### User Story Dependencies

- **US1 (Core CRUD)**: No dependencies on other stories
- **US6 (Scope Resolution)**: Depends on US1 (refactors CRUD operations)
- **US2 (Semantic Search)**: Depends on US1 (uses index and CRUD)
- **US3 (Graph Operations)**: Depends on US1 (uses CRUD for memories)
- **US4 (Hooks)**: Depends on US1, US6, US2 (uses CRUD, scope, semantic search)
- **US5 (Health & Quality)**: Depends on US1, US3 (uses CRUD, graph validation)

### Within Each Phase

1. **ALL Tests first** - Write and run ALL tests in the "Tests for User Story X" subsection
2. **Verify ALL fail** - Confirm each test fails for the expected reason (Red phase)
3. **ALL Implementation** - Proceed to "Implementation for User Story X" subsection
4. **Verify tests pass** - Each implementation should make corresponding test(s) pass (Green phase)
5. **Refactor** - Clean up while maintaining passing tests (Refactor phase)

### Parallel Opportunities

- Phase 0: T003, T004, T005, T006, T007, T008 can run in parallel
- Phase 1 Tests: T011-T019 can run in parallel (all independent test files)
- Phase 1 Implementation: T022-T027 can run in parallel (different files, no dependencies)
- Phase 2 Tests: T035-T038 can run in parallel
- Phase 2 Implementation: T045-T047 can run in parallel
- Phase 3 Tests: T057-T061 can run in parallel
- Phase 3 Implementation: T066-T070 can run in parallel
- Phase 4 Tests: T077-T083 can run in parallel
- Phase 4 Implementation: T088-T091 can run in parallel
- Phase 5 Tests: T100-T103 can run in parallel
- Phase 5 Implementation: T108-T111 can run in parallel
- Phase 6 Tests: T123-T129 can run in parallel
- Phase 6 Implementation: T133-T137 can run in parallel
- Phase 7 Tests: T147-T149 can run in parallel
- Phase 7 Implementation: T151-T156 can run in parallel

---

## Implementation Strategy

### MVP First (Phase 0-2 Only)

1. Complete Phase 0: Setup
2. Complete Phase 1: Core CRUD (US1)
3. Complete Phase 2: Scope Resolution (US6)
4. **STOP and VALIDATE**: Test independently
5. Deploy/demo basic memory system

### Incremental Delivery

1. Phase 0-1 → Basic memory CRUD operational
2. Add Phase 2 → Multi-scope storage works
3. Add Phase 3 → Semantic search available
4. Add Phase 4 → Graph linking operational
5. Add Phase 5 → Contextual hooks active
6. Add Phase 6 → Health monitoring ready
7. Add Phase 7 → Plugin distributable

### Parallel Team Strategy

With multiple developers (not applicable for solo development):

1. Team completes Phase 0-1 together
2. Once Phase 1 done:
   - Developer A: Phase 2 (Scope Resolution)
   - Developer B: Phase 3 (Semantic Search) - starts after Phase 1
   - Developer C: Phase 4 (Graph Operations) - starts after Phase 1
3. Phases integrate independently after completion

---

## Validation Checklist

Before finalising tasks.md, verify:

- [x] All template sample tasks removed
- [x] Each user story has "### Tests for User Story X" subsection
- [x] Each user story has "### Implementation for User Story X" subsection
- [x] Tests subsection comes BEFORE Implementation subsection in EVERY phase
- [x] NO interleaved test/implementation tasks
- [x] All tasks use absolute file paths
- [x] Parallelisable tasks marked with [P]
- [x] Story-specific tasks tagged with [USX]
- [x] Checkpoints included for each user story
- [x] YAML frontmatter updated with phase mappings

---

## Notes

- Tasks marked [P] can run in parallel (different files, no dependencies)
- Tasks marked [USX] map to specific user story for traceability
- Each user story is independently completable and testable
- Verify ALL tests fail before ANY implementation begins (critical for TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total tasks: 166 (tests: 65, implementation: 101)
- Estimated duration: 21-34 days (solo, full-time)
