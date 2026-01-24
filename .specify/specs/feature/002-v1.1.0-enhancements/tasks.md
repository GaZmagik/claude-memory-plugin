---
# YAML Frontmatter for spec-lint
description: "Executable task list for v1.1.0 enhancements to Claude Code Memory Plugin"
phases:
  - id: 0
    name: "Phase 0: Dependencies & Research Validation"
    maps_to: []
  - id: 1
    name: "Phase 1: Enhanced Hint Visibility"
    maps_to: ["US1"]
  - id: 2
    name: "Phase 2: Enhanced Memory Injection"
    maps_to: ["US3"]
  - id: 3
    name: "Phase 3: Auto-Selection with --auto Flag"
    maps_to: ["US2"]
  - id: 4
    name: "Phase 4: Cross-Provider Agent Calling"
    maps_to: ["US4"]
---

# Tasks: v1.1.0 Enhancements

**Feature**: 002-v1.1.0-enhancements
**Input**: Design documents from `/home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/002-v1.1.0-enhancements/`
**Prerequisites**: spec.md, plan.md, data-model.md, contracts/cli-flags.md, contracts/configuration-schema.md

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

## Phase 0: Dependencies & Research Validation

**Purpose**: Install dependencies, validate research findings, prepare environment

**Duration**: 0.5-1 day

- [ ] T001 Review research.md findings and validate technical decisions
- [ ] T002 [P] Install prompts npm package (^2.4.2) in /home/gareth/.vs/claude-memory-plugin/package.json
- [ ] T003 [P] Verify Ollama installation and gemma3:1b model availability
- [ ] T004 [P] Verify existing session-state mechanism in /home/gareth/.vs/claude-memory-plugin/hooks/src/session/session-cache.ts
- [ ] T005 [P] Verify existing discovery.ts service in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/discovery.ts
- [ ] T006 [P] Verify existing ollama.ts service in /home/gareth/.vs/claude-memory-plugin/hooks/src/services/ollama.ts

**Checkpoint**: Dependencies installed, research validated, existing services confirmed

---

## Phase 1: Enhanced Hint Visibility (US1 - Priority P1)

**Goal**: Progressive disclosure of CLI hints via stderr, interactive prompts for complex thoughts

**Duration**: 1-2 days

**Independent Test**: Run `memory think create "Topic"` 4 times, verify hints appear first 3 times only, verify interactive prompt for complex thought

### Tests for User Story 1

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T007 [P] [US1] Unit test for HintState session storage in /home/gareth/.vs/claude-memory-plugin/tests/unit/cli/test-hint-tracker.spec.ts
- [ ] T008 [P] [US1] Unit test for progressive disclosure threshold logic in /home/gareth/.vs/claude-memory-plugin/tests/unit/cli/test-hint-threshold.spec.ts
- [ ] T009 [P] [US1] Unit test for complex thought detection (>200 chars or "?") in /home/gareth/.vs/claude-memory-plugin/tests/unit/cli/test-complex-thought.spec.ts
- [ ] T010 [P] [US1] Unit test for stderr hint output formatting in /home/gareth/.vs/claude-memory-plugin/tests/unit/cli/test-hint-output.spec.ts
- [ ] T011 [US1] Integration test for hint display count tracking in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-hint-lifecycle.spec.ts
- [ ] T012 [US1] Integration test for interactive prompt triggering in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-interactive-prompt.spec.ts
- [ ] T013 [US1] Integration test for --non-interactive flag suppression in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-non-interactive.spec.ts

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create HintState interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/hint-state.ts
- [ ] T015 [P] [US1] Implement hint-tracker.ts with session state persistence in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/hint-tracker.ts
- [ ] T016 [US1] Modify response.ts to output hints to stderr before JSON to stdout in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/response.ts
- [ ] T017 [US1] Add complex thought detection logic to think.ts in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/think.ts
- [ ] T018 [US1] Add interactive prompt using prompts library in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/think.ts
- [ ] T019 [US1] Implement --non-interactive flag handling in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/think.ts
- [ ] T020 [US1] Update help text with 3+ examples (--call, --style, --agent) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/think.ts

**Checkpoint**: US1 complete - hints appear in stderr with progressive disclosure, interactive prompts for complex thoughts, --non-interactive flag works

---

## Phase 2: Enhanced Memory Injection (US3 - Priority P2)

**Goal**: Extend PostToolUse hook to inject decisions and learnings in addition to gotchas

**Duration**: 2-3 days

**Independent Test**: Enable decision injection in config, read file with related decisions, verify injection with correct formatting

### Tests for User Story 3

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T021 [P] [US3] Unit test for InjectionConfig parsing from memory.local.md in /home/gareth/.vs/claude-memory-plugin/tests/unit/settings/test-injection-config.spec.ts
- [ ] T022 [P] [US3] Unit test for per-type threshold calculation with multipliers in /home/gareth/.vs/claude-memory-plugin/tests/unit/memory/test-threshold-multipliers.spec.ts
- [ ] T023 [P] [US3] Unit test for memory type prioritisation (gotcha > decision > learning) in /home/gareth/.vs/claude-memory-plugin/tests/unit/memory/test-type-priority.spec.ts
- [ ] T024 [P] [US3] Unit test for session deduplication cache in /home/gareth/.vs/claude-memory-plugin/tests/unit/memory/test-injection-dedup.spec.ts
- [ ] T025 [US3] Integration test for default config (backward compatibility - gotchas only) in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-default-injection.spec.ts
- [ ] T026 [US3] Integration test for opt-in decision injection in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-decision-injection.spec.ts
- [ ] T027 [US3] Integration test for opt-in learning injection in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-learning-injection.spec.ts
- [ ] T028 [US3] Integration test for hook multipliers (Bash 1.2x, Edit/Write 0.8x) in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-hook-multipliers.spec.ts
- [ ] T029 [US3] Integration test for single semantic search with client-side filtering in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-single-search.spec.ts
- [ ] T030 [US3] Integration test for total memory limit (10 max) in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-injection-limit.spec.ts

### Implementation for User Story 3

- [ ] T031 [P] [US3] Create InjectionConfig interface in /home/gareth/.vs/claude-memory-plugin/hooks/src/types/injection-config.ts
- [ ] T032 [P] [US3] Implement injection-settings.ts config parser in /home/gareth/.vs/claude-memory-plugin/hooks/src/settings/injection-settings.ts
- [ ] T033 [P] [US3] Create enhanced-injector.ts with multi-type support in /home/gareth/.vs/claude-memory-plugin/hooks/src/memory/enhanced-injector.ts
- [ ] T034 [US3] Implement effective threshold calculation with multipliers in /home/gareth/.vs/claude-memory-plugin/hooks/src/memory/enhanced-injector.ts
- [ ] T035 [US3] Implement client-side type filtering after single search in /home/gareth/.vs/claude-memory-plugin/hooks/src/memory/enhanced-injector.ts
- [ ] T036 [US3] Implement memory prioritisation (type priority then score) in /home/gareth/.vs/claude-memory-plugin/hooks/src/memory/enhanced-injector.ts
- [ ] T037 [US3] Implement session deduplication with (memoryId, type) cache key in /home/gareth/.vs/claude-memory-plugin/hooks/src/memory/enhanced-injector.ts
- [ ] T038 [US3] Add type-specific formatting with icons (🚨 📋 💡) in /home/gareth/.vs/claude-memory-plugin/hooks/src/memory/enhanced-injector.ts
- [ ] T039 [US3] Update memory-context.ts to use enhanced injector in /home/gareth/.vs/claude-memory-plugin/hooks/post-tool-use/memory-context.ts
- [ ] T040 [US3] Update memory.example.md with injection configuration documentation in /home/gareth/.vs/claude-memory-plugin/.claude/memory.example.md

**Checkpoint**: US3 complete - enhanced injection operational with opt-in decisions/learnings, single search, hook multipliers

---

## Phase 3: Auto-Selection with --auto Flag (US2 - Priority P2)

**Goal**: AI-powered agent/style/model selection using Ollama with heuristic fallback

**Duration**: 3-4 days

**Independent Test**: Run `memory think add "SQL injection" --auto`, verify Ollama selection and confirmation prompt

### Tests for User Story 2

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T041 [P] [US2] Unit test for heuristic keyword matching rules in /home/gareth/.vs/claude-memory-plugin/tests/unit/think/test-heuristics.spec.ts
- [ ] T042 [P] [US2] Unit test for Ollama prompt building with avoid list in /home/gareth/.vs/claude-memory-plugin/tests/unit/think/test-ollama-prompt.spec.ts
- [ ] T043 [P] [US2] Unit test for selection validation against discovery whitelist in /home/gareth/.vs/claude-memory-plugin/tests/unit/think/test-selection-validation.spec.ts
- [ ] T044 [P] [US2] Unit test for circuit breaker state tracking in /home/gareth/.vs/claude-memory-plugin/tests/unit/think/test-circuit-breaker.spec.ts
- [ ] T045 [P] [US2] Unit test for input sanitisation for Ollama prompts in /home/gareth/.vs/claude-memory-plugin/tests/unit/think/test-input-sanitisation.spec.ts
- [ ] T046 [US2] Integration test for Ollama-based selection (with mock) in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-ollama-selection.spec.ts
- [ ] T047 [US2] Integration test for heuristic fallback on Ollama timeout in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-heuristic-fallback.spec.ts
- [ ] T048 [US2] Integration test for circuit breaker activation after 3 failures in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-circuit-breaker-activation.spec.ts
- [ ] T049 [US2] Integration test for user confirmation prompt in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-auto-confirmation.spec.ts
- [ ] T050 [US2] Integration test for diversity via avoid list (3 different styles) in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-selection-diversity.spec.ts
- [ ] T051 [US2] Integration test for --auto with --non-interactive in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-auto-non-interactive.spec.ts

### Implementation for User Story 2

- [ ] T052 [P] [US2] Create AutoSelection interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/auto-selection.ts
- [ ] T053 [P] [US2] Create CircuitBreakerState interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/circuit-breaker.ts
- [ ] T054 [P] [US2] Implement heuristic keyword matching rules in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/heuristics.ts
- [ ] T055 [P] [US2] Implement input sanitisation for Ollama prompts in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/sanitise.ts
- [ ] T056 [US2] Implement Ollama selection with prompt building in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/ollama-selector.ts
- [ ] T057 [US2] Implement selection validation against discovery whitelist in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/validate-selection.ts
- [ ] T058 [US2] Implement circuit breaker state management in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/circuit-breaker.ts
- [ ] T059 [US2] Implement auto-selector.ts with tiered strategy (Ollama → heuristics) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/auto-selector.ts
- [ ] T060 [US2] Implement avoid list extraction from existing thoughts in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/avoid-list.ts
- [ ] T061 [US2] Add --auto flag handling to think.ts with confirmation prompt in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/think.ts
- [ ] T062 [US2] Add spinner display ("Analysing thought...") during Ollama invocation in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/think.ts

**Checkpoint**: US2 complete - auto-selection operational with Ollama, heuristic fallback, circuit breaker, user confirmation

---

## Phase 4: Cross-Provider Agent Calling (US4 - Priority P3)

**Goal**: Support Codex and Gemini CLIs alongside Claude for cross-provider calling

**Duration**: 2-3 days

**Independent Test**: Run `memory think add "Test" --call codex --model gpt-5-codex`, verify correct CLI invocation and attribution

### Tests for User Story 4

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [ ] T063 [P] [US4] Unit test for provider CLI command building (claude, codex, gemini) in /home/gareth/.vs/claude-memory-plugin/tests/unit/think/test-provider-commands.spec.ts
- [ ] T064 [P] [US4] Unit test for Codex output parsing (strip headers) in /home/gareth/.vs/claude-memory-plugin/tests/unit/think/test-codex-parser.spec.ts
- [ ] T065 [P] [US4] Unit test for Gemini output parsing (filter noise) in /home/gareth/.vs/claude-memory-plugin/tests/unit/think/test-gemini-parser.spec.ts
- [ ] T066 [P] [US4] Unit test for provider detection (which command) in /home/gareth/.vs/claude-memory-plugin/tests/unit/think/test-provider-detection.spec.ts
- [ ] T067 [P] [US4] Unit test for thought attribution formatting in /home/gareth/.vs/claude-memory-plugin/tests/unit/think/test-attribution.spec.ts
- [ ] T068 [US4] Integration test for Codex CLI invocation (mocked) in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-codex-invocation.spec.ts
- [ ] T069 [US4] Integration test for Gemini CLI invocation (mocked) in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-gemini-invocation.spec.ts
- [ ] T070 [US4] Integration test for --oss flag with Codex in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-codex-oss.spec.ts
- [ ] T071 [US4] Integration test for graceful error on missing CLI in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-missing-provider.spec.ts
- [ ] T072 [US4] Integration test for --agent warning with non-Claude providers in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-provider-warnings.spec.ts
- [ ] T072b [US4] Integration test for 30s provider CLI timeout in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-provider-timeout.spec.ts

### Implementation for User Story 4

- [ ] T073 [P] [US4] Create ProviderConfig interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/types/provider-config.ts
- [ ] T074 [P] [US4] Implement provider command builders in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/providers/commands.ts
- [ ] T075 [P] [US4] Implement Codex output parser in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/providers/codex-parser.ts
- [ ] T076 [P] [US4] Implement Gemini output parser in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/providers/gemini-parser.ts
- [ ] T077 [P] [US4] Implement provider detection utilities in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/providers/detect.ts
- [ ] T078 [US4] Implement providers.ts with all provider configs in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/providers.ts
- [ ] T079 [US4] Implement thought attribution formatter in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/attribution.ts
- [ ] T080 [US4] Modify ai-invoke.ts to route to different providers in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/ai-invoke.ts
- [ ] T081 [US4] Add --call flag parsing to think.ts in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/think.ts
- [ ] T082 [US4] Add --oss flag parsing and validation (Codex only) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/think.ts
- [ ] T083 [US4] Add provider-specific warnings (--agent with codex/gemini) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/think.ts
- [ ] T084 [US4] Add graceful error messages with installation instructions in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/providers/errors.ts
- [ ] T084b [US4] Implement 30s timeout for provider CLI invocations in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/think/providers/invoke.ts

**Checkpoint**: US4 complete - cross-provider calling operational for claude, codex, gemini with correct output parsing and attribution

---

## Phase 5: Integration, Testing & Documentation

**Goal**: Complete integration testing, performance validation, documentation updates

**Duration**: 1-2 days

### Integration & Validation Tasks

- [ ] T085 [P] Integration test for full workflow: hint → auto-selection → provider calling in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-full-workflow.spec.ts
- [ ] T086 [P] Integration test for backward compatibility (existing commands unchanged) in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-backward-compat-v1.1.spec.ts
- [ ] T087 [P] Integration test for config validation and defaults in /home/gareth/.vs/claude-memory-plugin/tests/integration/test-config-validation.spec.ts
- [ ] T088 [US1] Performance test: hint display adds <10ms latency in /home/gareth/.vs/claude-memory-plugin/tests/performance/test-hint-latency.spec.ts
- [ ] T089 [US2] Performance test: auto-selection with Ollama completes <1s in /home/gareth/.vs/claude-memory-plugin/tests/performance/test-auto-selection-speed.spec.ts
- [ ] T090 [US2] Performance test: heuristic fallback completes <100ms in /home/gareth/.vs/claude-memory-plugin/tests/performance/test-heuristic-speed.spec.ts
- [ ] T091 [US3] Performance test: enhanced injection adds <100ms latency in /home/gareth/.vs/claude-memory-plugin/tests/performance/test-injection-latency.spec.ts
- [ ] T091b [US1] Performance test: session state operations complete <50ms in /home/gareth/.vs/claude-memory-plugin/tests/performance/test-session-state-speed.spec.ts

### Documentation Tasks

- [ ] T092 [P] Update README.md with --auto flag documentation in /home/gareth/.vs/claude-memory-plugin/README.md
- [ ] T093 [P] Update README.md with cross-provider calling examples in /home/gareth/.vs/claude-memory-plugin/README.md
- [ ] T094 [P] Update memory.example.md with injection configuration section in /home/gareth/.vs/claude-memory-plugin/.claude/memory.example.md
- [ ] T095 [P] Update SKILL.md for memory skill with new features in /home/gareth/.vs/claude-memory-plugin/skills/memory/SKILL.md
- [ ] T096 Create CHANGELOG.md entry for v1.1.0 in /home/gareth/.vs/claude-memory-plugin/CHANGELOG.md
- [ ] T097 Update quickstart.md with validation scenarios for all features in /home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/002-v1.1.0-enhancements/quickstart.md
- [ ] T098 Validate all 4 user stories against acceptance criteria from spec.md
- [ ] T099 Run full test suite and verify all tests pass
- [ ] T100 Update package.json version to 1.1.0 in /home/gareth/.vs/claude-memory-plugin/package.json

**Checkpoint**: All features tested, documented, validated against acceptance criteria

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Dependencies)**: No dependencies - start immediately
- **Phase 1 (Hint Visibility)**: Depends on Phase 0 completion
- **Phase 2 (Enhanced Injection)**: Depends on Phase 0 completion
- **Phase 3 (Auto-Selection)**: Depends on Phase 0, Phase 1 completion (uses prompts for confirmation)
- **Phase 4 (Cross-Provider)**: Depends on Phase 0 completion
- **Phase 5 (Integration)**: Depends on Phase 1-4 completion

### User Story Dependencies

- **US1 (Hint Visibility)**: No dependencies on other stories
- **US3 (Enhanced Injection)**: No dependencies on other stories
- **US2 (Auto-Selection)**: Depends on US1 (uses interactive prompts from Phase 1)
- **US4 (Cross-Provider)**: No dependencies on other stories

### Within Each Phase

1. **ALL Tests first** - Write and run ALL tests in the "Tests for User Story X" subsection
2. **Verify ALL fail** - Confirm each test fails for the expected reason (Red phase)
3. **ALL Implementation** - Proceed to "Implementation for User Story X" subsection
4. **Verify tests pass** - Each implementation should make corresponding test(s) pass (Green phase)
5. **Refactor** - Clean up while maintaining passing tests (Refactor phase)

### Parallel Opportunities

- Phase 0: T002-T006 can run in parallel (independent verifications)
- Phase 1 Tests: T007-T010 can run in parallel (different test files)
- Phase 1 Implementation: T014-T015 can run in parallel (different files)
- Phase 2 Tests: T021-T024 can run in parallel (different test files)
- Phase 2 Implementation: T031-T033 can run in parallel (different files)
- Phase 3 Tests: T041-T045 can run in parallel (different test files)
- Phase 3 Implementation: T052-T055 can run in parallel (different files)
- Phase 4 Tests: T063-T067 can run in parallel (different test files)
- Phase 4 Implementation: T073-T077 can run in parallel (different files)
- Phase 5: T085-T087, T088-T091, T092-T095 can run in parallel (independent validations)

**Phases 1, 2, 4 can be implemented in parallel** (US1, US3, US4 are independent)
**Phase 3 must wait for Phase 1** (US2 depends on US1's interactive prompts)

---

## Implementation Strategy

### MVP First (Phase 0-1 Only)

1. Complete Phase 0: Dependencies
2. Complete Phase 1: Hint Visibility (US1)
3. **STOP and VALIDATE**: Test independently
4. Deploy/demo hint system

### Incremental Delivery

1. Phase 0-1 → Hint visibility operational
2. Add Phase 2 → Enhanced injection operational
3. Add Phase 3 → Auto-selection operational
4. Add Phase 4 → Cross-provider calling operational
5. Phase 5 → Complete integration and documentation

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 0 together
2. Once Phase 0 done:
   - Developer A: Phase 1 (Hint Visibility)
   - Developer B: Phase 2 (Enhanced Injection)
   - Developer C: Phase 4 (Cross-Provider)
3. Developer A then proceeds to Phase 3 (Auto-Selection) after Phase 1
4. All converge on Phase 5 (Integration)

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
- Total tasks: 103 (tests: 49, implementation: 46, documentation: 8)
- Estimated duration: 8-12 days (solo, full-time)
