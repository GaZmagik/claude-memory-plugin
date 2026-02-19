---
# YAML Frontmatter for spec-lint
description: "Executable task list for rule and reminder graph nodes feature"
phases:
  - id: 0
    name: "Phase 0: Research Validation"
    maps_to: []
  - id: 1
    name: "Phase 2A: Type System Foundation"
    maps_to: ["US1", "US2", "US3", "US4"]
  - id: 2
    name: "Phase 2B: External Module Core"
    maps_to: ["US1", "US2"]
  - id: 3
    name: "Phase 2C: Integration & Guards"
    maps_to: ["US3", "US5"]
  - id: 4
    name: "Phase 2D: Quality Exclusions"
    maps_to: ["US4"]
  - id: 5
    name: "Phase 2E: Testing & Documentation"
    maps_to: ["US1", "US2", "US3", "US4", "US5"]
---

# Tasks: Rule and Reminder Graph Nodes

**Feature**: 005-rule-reminder-graph-nodes
**Input**: Design documents from `/home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/005-rule-reminder-graph-nodes/`
**Prerequisites**: spec.md, plan.md, data-model.md, contracts/external-api.md

**Phase Numbering**: Tasks are numbered sequentially across phases. Phase 0 = T001-T008, Phase 2A = T009-T032, Phase 2B = T033-T087, Phase 2C = T088-T135, Phase 2D = T136-T145, Phase 2E = T146-T161. Phase IDs in frontmatter (0-5) map to implementation phases (0, 2A-2E) from plan.md.

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

- [X] T001 Review plan.md, research.md, data-model.md and validate technical decisions for external file indexing
- [X] T002 [P] Verify existing MemoryType enum in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/enums.ts
- [X] T003 [P] Verify existing EdgeType enum in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/enums.ts
- [X] T004 [P] Verify existing IndexEntry interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/memory.ts
- [X] T005 [P] Verify existing sync system in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/sync.ts
- [X] T006 [P] Verify existing Mermaid renderer in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/mermaid.ts
- [X] T007 [P] Verify existing embedding pipeline in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/embedding/
- [X] T008 [P] Verify existing quality assessment in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/quality/assess.ts

**Checkpoint**: Research validated, existing services confirmed, ready for implementation

---

## Phase 2A: Type System Foundation

**Goal**: Add MemoryType.Rule, MemoryType.Reminder, EdgeType extensions, and IndexEntry extensions

**Duration**: 1-2 days

**Maps to**: US1 (Rule File Discovery), US2 (Reminder File Discovery), US3 (Read-Only Protection), US4 (Graph Visualisation)

### Tests for Phase 2A

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T009 [P] [US1] Unit test for MemoryType.Rule enum value in /home/gareth/.vs/claude-memory-plugin/tests/unit/types/test-memory-type-rule.spec.ts
- [ ] T010 [P] [US2] Unit test for MemoryType.Reminder enum value in /home/gareth/.vs/claude-memory-plugin/tests/unit/types/test-memory-type-reminder.spec.ts
- [ ] T011 [P] [US4] Unit test for EdgeType.GovernedBy enum value in /home/gareth/.vs/claude-memory-plugin/tests/unit/types/test-edge-type-governed-by.spec.ts
- [ ] T012 [P] [US4] Unit test for EdgeType.RemindedBy enum value in /home/gareth/.vs/claude-memory-plugin/tests/unit/types/test-edge-type-reminded-by.spec.ts
- [ ] T013 [P] [US1] Unit test for IndexEntry.externalFileKind optional field in /home/gareth/.vs/claude-memory-plugin/tests/unit/types/test-index-entry-external-kind.spec.ts
- [ ] T014 [P] [US1] Unit test for IndexEntry.externalPath optional field in /home/gareth/.vs/claude-memory-plugin/tests/unit/types/test-index-entry-external-path.spec.ts
- [ ] T015 [P] [US1] Unit test for parseMemoryType handling rule type in /home/gareth/.vs/claude-memory-plugin/tests/unit/cli/test-parse-memory-type-rule.spec.ts
- [ ] T016 [P] [US2] Unit test for parseMemoryType handling reminder type in /home/gareth/.vs/claude-memory-plugin/tests/unit/cli/test-parse-memory-type-reminder.spec.ts
- [ ] T017 [P] [US4] Unit test for Mermaid NODE_SHAPES hexagon for rule in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-mermaid-rule-shape.spec.ts
- [ ] T018 [P] [US4] Unit test for Mermaid NODE_SHAPES cylinder for reminder in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-mermaid-reminder-shape.spec.ts
- [ ] T019 [P] [US4] Unit test for Mermaid NODE_STYLES distinct colour for rule in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-mermaid-rule-style.spec.ts
- [ ] T020 [P] [US4] Unit test for Mermaid NODE_STYLES distinct colour for reminder in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-mermaid-reminder-style.spec.ts

### Implementation for Phase 2A

- [ ] T021 [P] [US1] Add MemoryType.Rule to enum in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/enums.ts
- [ ] T022 [P] [US2] Add MemoryType.Reminder to enum in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/enums.ts
- [ ] T023 [P] [US4] Add EdgeType.GovernedBy to enum in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/enums.ts
- [ ] T024 [P] [US4] Add EdgeType.RemindedBy to enum in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/enums.ts
- [ ] T025 [P] [US1] Extend IndexEntry interface with externalFileKind optional field in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/memory.ts
- [ ] T026 [P] [US1] Extend IndexEntry interface with externalPath optional field in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/memory.ts
- [ ] T027 [P] [US1] Add parseMemoryType case for rule in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/helpers.ts
- [ ] T028 [P] [US2] Add parseMemoryType case for reminder in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/helpers.ts
- [ ] T029 [P] [US4] Add NODE_SHAPES hexagon entry for rule in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/mermaid.ts
- [ ] T030 [P] [US4] Add NODE_SHAPES cylinder entry for reminder in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/mermaid.ts
- [ ] T031 [P] [US4] Add NODE_STYLES distinct colour for rule in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/mermaid.ts
- [ ] T032 [P] [US4] Add NODE_STYLES distinct colour for reminder in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/mermaid.ts

**Checkpoint**: Type system extended, enum values available, Mermaid rendering configured

---

## Phase 2B: External Module Core

**Goal**: Implement external file discovery and indexing algorithms

**Duration**: 4-5 days

**Maps to**: US1 (Rule File Discovery), US2 (Reminder File Discovery)

### Tests for Phase 2B

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T033 [P] [US1] Unit test for ExternalFileKind enum values in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-external-file-kind.spec.ts
- [ ] T034 [P] [US1] Unit test for ExternalFileEntry interface validation in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-external-file-entry.spec.ts
- [ ] T035 [P] [US1] Unit test for discoverRuleFiles finding CLAUDE.md in project root in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-discover-claude-md.spec.ts
- [ ] T036 [P] [US1] Unit test for discoverRuleFiles finding CLAUDE.local.md in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-discover-claude-local-md.spec.ts
- [ ] T037 [P] [US1] Unit test for discoverRuleFiles finding rules directory files in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-discover-rules-files.spec.ts
- [ ] T038 [P] [US1] Unit test for discoverRuleFiles walking ancestor directories in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-discover-ancestor-claude.spec.ts
- [ ] T039 [P] [US1] Unit test for discoverRuleFiles excluding vendor directories in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-discover-exclude-vendors.spec.ts
- [ ] T040 [P] [US1] Unit test for discoverRuleFiles resolving symlinks to canonical paths in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-discover-resolve-symlinks.spec.ts
- [ ] T040A [P] [US1] Unit test for discoverRuleFiles handling symlink loops without infinite recursion in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-discover-symlink-loops.spec.ts
- [ ] T040B [P] [US1] Unit test for discoverRuleFiles handling broken symlinks gracefully in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-discover-broken-symlinks.spec.ts
- [ ] T041 [P] [US1] Unit test for deterministic rule ID generation in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-rule-id-generation.spec.ts
- [ ] T042 [P] [US1] Unit test for rule file scope determination in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-rule-scope-determination.spec.ts
- [ ] T043 [P] [US2] Unit test for discoverReminderFiles finding MEMORY.md in agent directories in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-discover-memory-md.spec.ts
- [ ] T044 [P] [US2] Unit test for discoverReminderFiles finding sub-files in agent directories in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-discover-agent-subfiles.spec.ts
- [ ] T045 [P] [US2] Unit test for discoverReminderFiles handling missing MEMORY.md gracefully in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-discover-missing-memory.spec.ts
- [ ] T046 [P] [US2] Unit test for discoverReminderFiles extracting agent name correctly in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-discover-agent-name-extraction.spec.ts
- [ ] T047 [P] [US2] Unit test for deterministic reminder ID generation in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-reminder-id-generation.spec.ts
- [ ] T048 [P] [US2] Unit test for reminder file scope determination in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-reminder-scope-determination.spec.ts
- [ ] T049 [P] [US1] Unit test for discoverExternalFiles combining rules and reminders in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-discover-combined.spec.ts
- [ ] T050 [P] [US1] Unit test for indexExternalFiles creating GraphNode for rule in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-index-create-rule-node.spec.ts
- [ ] T051 [P] [US2] Unit test for indexExternalFiles creating GraphNode for reminder in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-index-create-reminder-node.spec.ts
- [ ] T052 [P] [US1] Unit test for indexExternalFiles creating IndexEntry with externalPath in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-index-create-entry.spec.ts
- [ ] T053 [P] [US1] Unit test for indexExternalFiles generating embedding via provider in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-index-generate-embedding.spec.ts
- [ ] T054 [P] [US1] Unit test for indexExternalFiles reusing cached embedding on hash match in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-index-cache-reuse.spec.ts
- [ ] T055 [P] [US1] Unit test for indexExternalFiles updating embedding on hash mismatch in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-index-update-embedding.spec.ts
- [ ] T056 [P] [US1] Unit test for indexExternalFiles removing stale external nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-index-remove-stale.spec.ts
- [ ] T057 [P] [US1] Unit test for indexExternalFiles handling missing embedding provider gracefully in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-index-no-ollama.spec.ts
- [ ] T058 [P] [US1] Unit test for indexExternalFiles respecting dryRun flag in /home/gareth/.vs/claude-memory-plugin/tests/unit/external/test-index-dry-run.spec.ts
- [ ] T058A [P] [US4] Unit test for suggest-links candidate filtering including rule and reminder nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/graph/test-suggest-links-external.spec.ts
- [ ] T059 [US1] Integration test for end-to-end rule discovery and indexing in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-rule-discovery-to-index.spec.ts
- [ ] T060 [US2] Integration test for end-to-end reminder discovery and indexing in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-reminder-discovery-to-index.spec.ts

### Implementation for Phase 2B

- [ ] T061 [P] [US1] Create ExternalFileKind enum in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-types.ts
- [ ] T062 [P] [US1] Create ExternalFileEntry interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-types.ts
- [ ] T063 [P] [US1] Create external-file-types.spec.ts co-located test file in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-types.spec.ts
- [ ] T064 [US1] Implement discoverRuleFiles with directory tree walking in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-discovery.ts
- [ ] T065 [US1] Implement vendor directory filtering in discoverRuleFiles in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-discovery.ts
- [ ] T066 [US1] Implement symlink resolution in discoverRuleFiles in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-discovery.ts
- [ ] T067 [US1] Implement deterministic rule ID generation in discoverRuleFiles in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-discovery.ts
- [ ] T067A [US1] Implement same-level file suffix disambiguation in discoverRuleFiles (handle both CLAUDE.md and .claude/CLAUDE.md at same directory level with -root, -dotclaude, -dotclaude-local suffixes) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-discovery.ts
- [ ] T068 [US1] Implement rule scope determination logic in discoverRuleFiles in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-discovery.ts
- [ ] T069 [US2] Implement discoverReminderFiles with agent directory enumeration in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-discovery.ts
- [ ] T070 [US2] Implement agent name extraction in discoverReminderFiles in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-discovery.ts
- [ ] T071 [US2] Implement deterministic reminder ID generation in discoverReminderFiles in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-discovery.ts
- [ ] T072 [US2] Implement reminder scope determination logic in discoverReminderFiles in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-discovery.ts
- [ ] T073 [US1] Implement discoverExternalFiles combining both discovery functions in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-discovery.ts
- [ ] T074 [P] [US1] Create external-file-discovery.spec.ts co-located test file in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-discovery.spec.ts
- [ ] T075 [P] [US1] Create IndexExternalFilesRequest interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-indexer.ts
- [ ] T076 [P] [US1] Create IndexExternalFilesResponse interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-indexer.ts
- [ ] T077 [US1] Implement indexExternalFiles with discovery integration in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-indexer.ts
- [ ] T078 [US1] Implement GraphNode creation for external files in indexExternalFiles in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-indexer.ts
- [ ] T079 [US1] Implement IndexEntry creation with externalPath in indexExternalFiles in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-indexer.ts
- [ ] T080 [US1] Implement embedding generation via existing pipeline in indexExternalFiles in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-indexer.ts
- [ ] T081 [US1] Implement content hash based cache invalidation in indexExternalFiles in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-indexer.ts
- [ ] T082 [US1] Implement stale node removal logic in indexExternalFiles in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-indexer.ts
- [ ] T083 [US1] Implement graceful Ollama fallback in indexExternalFiles in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-indexer.ts
- [ ] T084 [P] [US1] Create external-file-indexer.spec.ts co-located test file in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/external-file-indexer.spec.ts
- [ ] T085 [P] [US1] Create external module index.ts with public API exports in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/external/index.ts
- [ ] T085A [P] [US4] Modify suggest-links filtering to include type='rule' and type='reminder' nodes in candidate set in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/suggest-links.ts

**Checkpoint**: External module core complete, discovery and indexing functional, tests passing

---

## Phase 2C: Integration & Guards

**Goal**: Integrate external indexer into sync, add read-only guards, create index-context command

**Duration**: 3-4 days

**Maps to**: US3 (Read-Only Protection), US5 (Targeted Context Re-Indexing)

### Tests for Phase 2C

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T086 [P] [US3] Unit test for cmdWrite rejecting rule nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-write-reject-rule.spec.ts
- [ ] T087 [P] [US3] Unit test for cmdWrite rejecting reminder nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-write-reject-reminder.spec.ts
- [ ] T088 [P] [US3] Unit test for cmdDelete rejecting rule nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-delete-reject-rule.spec.ts
- [ ] T089 [P] [US3] Unit test for cmdDelete rejecting reminder nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-delete-reject-reminder.spec.ts
- [ ] T090 [P] [US3] Unit test for cmdRename rejecting rule nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-rename-reject-rule.spec.ts
- [ ] T091 [P] [US3] Unit test for cmdRename rejecting reminder nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-rename-reject-reminder.spec.ts
- [ ] T092 [P] [US3] Unit test for cmdMove rejecting rule nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-move-reject-rule.spec.ts
- [ ] T093 [P] [US3] Unit test for cmdMove rejecting reminder nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-move-reject-reminder.spec.ts
- [ ] T094 [P] [US3] Unit test for cmdPromote rejecting rule nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-promote-reject-rule.spec.ts
- [ ] T095 [P] [US3] Unit test for cmdPromote rejecting reminder nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-promote-reject-reminder.spec.ts
- [ ] T096 [P] [US3] Unit test for cmdRead handling externalPath field in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-read-external-path.spec.ts
- [ ] T097 [P] [US3] Unit test for cmdSearch including rule nodes in results in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-search-include-rules.spec.ts
- [ ] T098 [P] [US3] Unit test for cmdSemantic including reminder nodes in results in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-semantic-include-reminders.spec.ts
- [ ] T099 [P] [US3] Unit test for cmdLink allowing edges to rule nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-link-to-rule.spec.ts
- [ ] T100 [P] [US3] Unit test for cmdLink allowing edges to reminder nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-link-to-reminder.spec.ts
- [ ] T101 [P] [US3] Unit test for cmdUnlink allowing edge removal from rule nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-unlink-from-rule.spec.ts
- [ ] T102 [P] [US3] Unit test for cmdEdges showing edges for rule nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-edges-for-rule.spec.ts
- [ ] T103 [P] [US5] Unit test for syncMemories integrating external indexer as final pass in /home/gareth/.vs/claude-memory-plugin/tests/unit/maintenance/test-sync-external-integration.spec.ts
- [ ] T104 [P] [US5] Unit test for syncMemories reporting external node changes in /home/gareth/.vs/claude-memory-plugin/tests/unit/maintenance/test-sync-external-reporting.spec.ts
- [ ] T105 [P] [US5] Unit test for cmdIndexContext discovering and indexing external files in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-index-context-basic.spec.ts
- [ ] T106 [P] [US5] Unit test for cmdIndexContext respecting scope flag in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-index-context-scope.spec.ts
- [ ] T107 [P] [US5] Unit test for cmdIndexContext respecting agent flag in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-index-context-agent.spec.ts
- [ ] T108 [P] [US5] Unit test for cmdIndexContext respecting dryRun flag in /home/gareth/.vs/claude-memory-plugin/tests/unit/commands/test-index-context-dry-run.spec.ts
- [ ] T109 [US3] Integration test for write command rejecting rule node with clear error in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-write-reject-rule-integration.spec.ts
- [ ] T110 [US3] Integration test for delete command rejecting reminder node with clear error in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-delete-reject-reminder-integration.spec.ts
- [ ] T111 [US3] Integration test for read command displaying external file content in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-read-external-content.spec.ts
- [ ] T112 [US5] Integration test for sync command indexing external files in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-sync-with-external-files.spec.ts
- [ ] T113 [US5] Integration test for index-context command quick refresh in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-index-context-refresh.spec.ts

### Implementation for Phase 2C

- [ ] T114 [P] [US3] Add read-only guard to cmdWrite in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/write.ts
- [ ] T115 [P] [US3] Add read-only guard to cmdDelete in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/delete.ts
- [ ] T116 [P] [US3] Add read-only guard to cmdRename in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/rename.ts
- [ ] T117 [P] [US3] Add read-only guard to cmdMove in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/move.ts
- [ ] T118 [P] [US3] Add read-only guard to cmdPromote in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/promote.ts
- [ ] T119 [P] [US3] Update cmdRead to handle externalPath field in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/read.ts
- [ ] T120 [US5] Integrate indexExternalFiles into syncMemories as final pass in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/sync.ts
- [ ] T121 [US5] Update syncMemories to report external node changes in response in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/sync.ts
- [ ] T122 [US5] Create cmdIndexContext function in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/maintenance.ts
- [ ] T123 [US5] Implement scope filtering in cmdIndexContext in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/maintenance.ts
- [ ] T124 [US5] Implement agent filtering in cmdIndexContext in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/maintenance.ts
- [ ] T125 [US5] Implement dryRun support in cmdIndexContext in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/maintenance.ts
- [ ] T126 [US5] Add index-context command registration to CLI router in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/index.ts
- [ ] T127 [US5] Add index-context command help text to CLI documentation in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/help.ts

**Checkpoint**: Read-only protection enforced, sync integration complete, index-context command functional

---

## Phase 2D: Quality Exclusions

**Goal**: Auto-exclude rule and reminder nodes from quality scoring

**Duration**: 1 day

**Maps to**: US4 (Graph Visualisation and Linking)

### Tests for Phase 2D

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T128 [P] [US4] Unit test for quality assess excluding rule nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/quality/test-assess-exclude-rule.spec.ts
- [ ] T129 [P] [US4] Unit test for quality assess excluding reminder nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/quality/test-assess-exclude-reminder.spec.ts
- [ ] T130 [P] [US4] Unit test for audit command skipping rule nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/quality/test-audit-skip-rule.spec.ts
- [ ] T131 [P] [US4] Unit test for audit command skipping reminder nodes in /home/gareth/.vs/claude-memory-plugin/tests/unit/quality/test-audit-skip-reminder.spec.ts
- [ ] T132 [US4] Integration test for audit excluding all external nodes from report in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-audit-exclude-external.spec.ts

### Implementation for Phase 2D

- [ ] T133 [P] [US4] Add type check to exclude rule nodes in assess function in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/quality/assess.ts
- [ ] T134 [P] [US4] Add type check to exclude reminder nodes in assess function in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/quality/assess.ts
- [ ] T135 [US4] Update audit command to skip external nodes in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/quality.ts
- [ ] T136 [US4] Update audit-quick command to skip external nodes in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/quality.ts

**Checkpoint**: Quality scoring excludes external nodes, audit reports accurate

---

## Phase 2E: Testing & Documentation

**Goal**: End-to-end integration tests, README updates, validation scenarios

**Duration**: 2-3 days

**Maps to**: US1 (Rule File Discovery), US2 (Reminder File Discovery), US3 (Read-Only Protection), US4 (Graph Visualisation), US5 (Targeted Re-Indexing)

### Tests for Phase 2E

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T137 [P] [US1] Integration test for CLAUDE.md discovery and semantic search in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-claude-md-to-search.spec.ts
- [ ] T138 [P] [US1] Integration test for rules file discovery and keyword search in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-rules-file-to-search.spec.ts
- [ ] T139 [P] [US2] Integration test for agent MEMORY.md discovery and search in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-memory-md-to-search.spec.ts
- [ ] T140 [P] [US2] Integration test for agent sub-file discovery and search in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-agent-subfile-to-search.spec.ts
- [ ] T141 [P] [US3] Integration test for CLAUDE.md modification triggering embedding update in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-claude-md-update.spec.ts
- [ ] T142 [P] [US3] Integration test for CLAUDE.md deletion triggering node removal in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-claude-md-deletion.spec.ts
- [ ] T143 [P] [US4] Integration test for linking decision to rule with governed-by edge in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-link-decision-to-rule.spec.ts
- [ ] T144 [P] [US4] Integration test for linking gotcha to reminder with reminded-by edge in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-link-gotcha-to-reminder.spec.ts
- [ ] T145 [P] [US4] Integration test for mermaid rendering rule nodes as hexagons in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-mermaid-rule-hexagon.spec.ts
- [ ] T146 [P] [US4] Integration test for mermaid rendering reminder nodes as cylinders in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-mermaid-reminder-cylinder.spec.ts
- [ ] T147 [P] [US4] Integration test for suggest-links including rule nodes in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-suggest-links-rule.spec.ts
- [ ] T148 [P] [US5] Integration test for index-context performance vs full sync in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-index-context-performance.spec.ts

### Implementation for Phase 2E

- [ ] T149 [P] [US1] Update README.md with external file indexing feature documentation in /home/gareth/.vs/claude-memory-plugin/README.md
- [ ] T150 [P] [US1] Update README.md with rule and reminder node type descriptions in /home/gareth/.vs/claude-memory-plugin/README.md
- [ ] T151 [P] [US3] Update README.md with read-only semantics documentation in /home/gareth/.vs/claude-memory-plugin/README.md
- [ ] T152 [P] [US4] Update README.md with governed-by and reminded-by edge types in /home/gareth/.vs/claude-memory-plugin/README.md
- [ ] T153 [P] [US5] Update README.md with memory index-context command documentation in /home/gareth/.vs/claude-memory-plugin/README.md
- [ ] T154 [P] [US1] Add ID generation scheme documentation to data-model.md in /home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/005-rule-reminder-graph-nodes/data-model.md
- [ ] T155 [P] [US1] Add scope determination documentation to data-model.md in /home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/005-rule-reminder-graph-nodes/data-model.md
- [ ] T156 [US1] Run quickstart.md validation scenarios for rule discovery in /home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/005-rule-reminder-graph-nodes/quickstart.md
- [ ] T157 [US2] Run quickstart.md validation scenarios for reminder discovery in /home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/005-rule-reminder-graph-nodes/quickstart.md
- [ ] T158 [US3] Run quickstart.md validation scenarios for read-only protection in /home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/005-rule-reminder-graph-nodes/quickstart.md
- [ ] T159 [US4] Run quickstart.md validation scenarios for graph visualisation in /home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/005-rule-reminder-graph-nodes/quickstart.md
- [ ] T160 [US5] Run quickstart.md validation scenarios for index-context command in /home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/005-rule-reminder-graph-nodes/quickstart.md

**Checkpoint**: All integration tests passing, documentation complete, feature ready for review

---

## Dependencies & Execution Order

### Phase Dependencies

- **Research Validation (Phase 0)**: No dependencies - can start immediately
- **Type System Foundation (Phase 2A)**: Depends on Phase 0 completion
- **External Module Core (Phase 2B)**: Depends on Phase 2A completion (requires new enum values)
- **Integration & Guards (Phase 2C)**: Depends on Phase 2B completion (requires external module APIs)
- **Quality Exclusions (Phase 2D)**: Depends on Phase 2A completion (requires new type checks), can run parallel to Phase 2C
- **Testing & Documentation (Phase 2E)**: Depends on Phase 2C and Phase 2D completion

### User Story Dependencies

- **US1 (Rule File Discovery)**: Foundation for all other stories - P1 priority
- **US2 (Reminder File Discovery)**: Independent of US1 after Phase 2A - P2 priority
- **US3 (Read-Only Protection)**: Depends on US1/US2 (needs external nodes to exist) - P1 priority
- **US4 (Graph Visualisation)**: Independent after Phase 2A - P2 priority
- **US5 (Targeted Re-Indexing)**: Depends on US1/US2 (needs indexing to work) - P3 priority

### Within Each Phase

- Tests MUST be written and FAIL before implementation
- Type definitions before implementations that use them
- Discovery before indexing
- Core implementation before CLI integration
- Unit tests before integration tests

### Parallel Opportunities

- All Phase 0 verification tasks can run in parallel
- All Phase 2A tests can run in parallel (within test group)
- All Phase 2A implementation tasks can run in parallel
- Most Phase 2B tests can run in parallel (within test group)
- Most Phase 2B implementation tasks for types can run in parallel
- Most Phase 2C read-only guard tests can run in parallel
- Most Phase 2C read-only guard implementations can run in parallel
- Phase 2D can run in parallel with Phase 2C after Phase 2A completes
- All Phase 2E integration tests can run in parallel (within test group)
- All Phase 2E documentation tasks can run in parallel

---

## Implementation Strategy

### MVP First (US1 + US3 Only)

1. Complete Phase 0: Research Validation
2. Complete Phase 2A: Type System Foundation
3. Complete Phase 2B: External Module Core (rule discovery only)
4. Complete Phase 2C: Integration & Guards (read-only protection)
5. **STOP and VALIDATE**: Test rule discovery independently
6. Verify semantic search returns CLAUDE.md content
7. Verify write/delete commands reject rule nodes

### Incremental Delivery

1. Phase 0 → Research validated
2. Phase 2A → Type system ready
3. Phase 2B → Discovery and indexing functional (US1 + US2)
4. Phase 2C → Read-only protection + sync integration (US3 + US5)
5. Phase 2D → Quality exclusions (US4)
6. Phase 2E → Integration tests and documentation (all stories validated)

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 0 + Phase 2A together
2. Once Phase 2A is done:
   - Developer A: Phase 2B (external module core)
   - Developer B: Phase 2D (quality exclusions - independent)
3. Once Phase 2B is done:
   - Developer A: Phase 2C (integration & guards)
4. Once Phase 2C + Phase 2D are done:
   - Developers A + B: Phase 2E (integration tests in parallel)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story delivers independently testable value
- Verify tests fail before implementing (Red-Green-Refactor)
- Commit after each logical task group
- External files are read-only - never modified by plugin
- Embedding generation is optional (graceful Ollama fallback)
- Discovery performance optimised via vendor filtering and canonical path caching
