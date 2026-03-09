---
description: "Executable task list for memory summarize command (v1.8.0)"
phases:
  - id: 0
    name: "Phase 0: Pre-flight Verification"
    maps_to: []
  - id: 1
    name: "Phase A: Core Summarisation Module"
    maps_to: ["US-1", "US-2", "US-3", "US-4", "US-6"]
  - id: 2
    name: "Phase B: CLI Handler Update"
    maps_to: ["US-1", "US-2", "US-3", "US-4", "US-5", "US-7", "US-8"]
  - id: 3
    name: "Phase C: Agent Scope Support"
    maps_to: ["US-5"]
  - id: 4
    name: "Phase D: Help Entry Update"
    maps_to: ["FR-019"]
  - id: 5
    name: "Phase E: Quickstart Validation"
    maps_to: ["SC-001", "SC-002", "SC-003", "SC-004", "SC-005", "SC-006", "SC-007", "SC-008", "SC-009", "SC-010", "SC-011", "SC-012"]
---

# Tasks: Memory Summarize Command

**Feature**: 006-memory-summarize
**Input**: Design documents from `/home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/006-memory-summarize/`
**Prerequisites**: spec.md, plan.md, data-model.md, contracts/summarize-api.md, quickstart.md

**Phase Numbering**: Tasks are numbered sequentially across phases. Phase 0 = T001–T008, Phase A = T009–T055, Phase B = T056–T084, Phase C = T085–T094, Phase D = T095–T103, Phase E = T104–T116.

**TDD Workflow**: All implementation tasks follow Red-Green-Refactor cycle. Within each phase, ALL test tasks are grouped before ALL implementation tasks — no interleaving permitted.

**Mock pattern**: Use `vi.spyOn(module, 'functionName')` throughout — confirmed pattern in `suggest.spec.ts` and `crud.spec.ts` (verified 2026-03-07). Do NOT use `mock.module()` or `vi.mock()` factories. Note: a memory system gotcha references `mock.module()` for Bun but that applies to a different test context, not these CLI command specs.

---

## TDD Workflow Integration

Each implementation task follows the **Red-Green-Refactor** cycle:

| Phase | Action | Verification |
|-------|--------|--------------|
| Red | Write failing test | Test compiles, runs, and fails for expected reason |
| Green | Write minimum code to pass | Test now passes |
| Refactor | Clean up without changing behaviour | All tests still pass |

**TDD Status Reporting**: Include in task completion:
```
TDD: test first? ✅/❌ | seen failing? ✅/❌ | now passing? ✅/❌
```

---

## Phase 0: Pre-flight Verification

**Purpose**: Validate existing code state, confirm dependencies, identify exact integration points before writing any new code.

- [x] T001 [P] Read existing stub in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts and confirm cmdSummarize stub shape
- [x] T002 [P] Read existing stub tests in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts and confirm the two stub tests to be removed ('returns stub response', 'accepts type positional')
- [x] T003 [P] Verify ollama.ts exports generate() and isAvailable() in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/services/ollama.ts
- [x] T004 [P] Verify listMemories() signature in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/list.ts
- [x] T005 [P] Verify readMemory() signature in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/read.ts
- [x] T006 [P] Verify helper exports (resolveAgentScopePath, getResolvedScopePath, parseScope, validateIncludeShared, resolveSharedScopePaths) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/helpers.ts
- [x] T007 [P] Verify discoverAgents() export and signature in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/core/agent-discovery.ts
- [x] T008 [P] Verify ANALYSIS_HELP.summarize stub shape in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/command-help/entries/analysis.ts
- [x] T008b [P] Verify readContextWindow() accessibility in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/services/ollama.ts — function is currently private. Determine whether to export it or add a new getContextWindow() export for use by summarize.ts. SummarizeRequest.contextWindow field requires a source for this value.

**Checkpoint**: All dependency signatures confirmed, stub tests identified, contextWindow access resolved, ready for Phase A

---

## Phase A: Core Summarisation Module

**Goal**: Create `summarize/summarize.ts` with all internal functions fully tested and passing. This phase delivers the entire business logic layer — CLI handler wiring happens in Phase B.

**Maps to**: US-1 (per-type LLM summary), US-2 (Ollama fallback), US-3 (overview mode), US-4 (digest mode), US-6 (context window chunking)

### Tests for Phase A

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

**Gotcha**: positional arg parsing — after command routing, `args.positional[0]` is the type/ID of the sub-command, NOT index 1 of the full positional array. Test fixtures for cmdSummarize must use `positional: ['decision']` not `positional: ['summarize', 'decision']`.

**Gotcha**: Content truncation at 6,000 chars per memory before chunking — this must be exercised in tests or context length errors will occur against Ollama.

**Gotcha**: Use `vi.spyOn(module, 'fn')` not `mock.module()` — the Bun vitest-compatible pattern used throughout this codebase.

- [x] T009 [P] [US-1] Write test: truncateContent returns content unchanged when content.length <= maxChars in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T010 [P] [US-1] Write test: truncateContent slices at last word boundary before maxChars and appends ' [...]' in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T011 [P] [US-1] Write test: truncateContent hard-slices at maxChars when no space exists before limit in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T012 [P] [US-6] Write test: buildChunks returns single chunk when total content fits within budget in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T013 [P] [US-6] Write test: buildChunks splits into multiple chunks when content exceeds budget in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T014 [P] [US-6] Write test: buildChunks preserves memory order across chunks in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T015 [P] [US-6] Write test: buildChunks places single oversized memory in its own chunk (totalChars may exceed budget only in this edge case) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T016 [P] [US-1] Write test: buildPrompt per-type template contains typeLabel and memory title/content in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T017 [P] [US-3] Write test: buildPrompt overview template contains all memory titles with type labels in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T018 [P] [US-4] Write test: buildPrompt digest template contains single memory title and content in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T019 [P] [US-6] Write test: mapReduceSummarize calls generate() exactly once when corpus fits in single chunk in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T020 [P] [US-6] Write test: mapReduceSummarize calls generate() N+1 times when corpus requires N chunks (map phase N calls, reduce phase 1 call) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T021 [P] [US-6] Write test: mapReduceSummarize passes timeoutMs to every generate() call in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T022 [P] [US-6] Write test: mapReduceSummarize returns empty string when generate() returns empty string for single chunk in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T023 [P] [US-2] Write test: summarize() returns fallback listing when isAvailable() returns false, with no generate() call made in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T024 [P] [US-2] Write test: summarize() fallback result contains FallbackListing entries with id/type/title/tags fields in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T025 [P] [US-2] Write test: summarize() fallback result contains non-empty hint field in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T026 [P] [US-1] Write test: summarize() per-type mode returns summaries Record with one key per type present in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T027 [P] [US-1] Write test: summarize() per-type mode memoriesIncluded lists IDs of all successfully read memories in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T028 [P] [US-1] Write test: summarize() per-type mode with typeFilter collects and summarises only that type in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T029 [P] [US-3] Write test: summarize() overview mode returns single summary string (not per-type Record) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T030 [P] [US-3] Write test: summarize() overview mode memoriesIncluded lists all contributing IDs across all types in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T031 [P] [US-4] Write test: summarize() digest mode returns summary string for the single specified memory ID in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T032 [P] [US-4] Write test: summarize() digest mode memoriesIncluded contains exactly the one digestId in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T032b [P] [US-4] Write test: summarize() digest mode returns error result with 'Memory not found: <id>' when readMemory() fails for the specified digestId (FR-007) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T033 [P] [US-1] Write test: summarize() returns success with empty memoriesIncluded when listMemories() returns empty array in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T034 [P] [US-1] Write test: summarize() skips memory and emits stderr warning when readMemory() throws for that ID, excluded ID absent from memoriesIncluded in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T035 [P] [US-1] Write test: summarize() truncates memory content exceeding MAX_MEMORY_CONTENT_CHARS (6000) before accumulating into chunks in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T036 [P] [US-8] Write test: summarize() passes timeoutMs from request to every generate() call in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts

### Implementation for Phase A

- [x] T037 Create /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts with security comment block documenting scope path resolution, content authorship, and ID validation
- [x] T038 [P] Export constants at top of summarize.ts: CHUNK_BUDGET_RATIO = 0.6, CHARS_PER_TOKEN = 4, MAX_MEMORY_CONTENT_CHARS = 6_000, DEFAULT_TIMEOUT_MS = 120_000, DEFAULT_LIMIT = 50 in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T039 [P] Export SummarizeMode type, FallbackListing interface, SummarizeResult interface, SummarizeRequest interface in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T040 [P] Implement truncateContent(content: string, maxChars: number): string — word boundary slice with ' [...]' suffix, hard-slice fallback, stderr warning on truncation in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T041 [P] Implement buildChunks(memories: MemoryContent[], chunkBudgetChars: number): SummaryChunk[] — greedy sequential packing, single oversized memory gets own chunk in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T042 [P] Implement buildPrompt(memories: MemoryContent[], mode: SummarizeMode, typeLabel?: string): string — per-type, overview, and digest templates per contracts/summarize-api.md in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T043 [P] Implement buildReducePrompt(chunkSummaries: string[]): string — merge template per contracts/summarize-api.md in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T044 Implement mapReduceSummarize(chunks: SummaryChunk[], mode: SummarizeMode, typeLabel: string | undefined, timeoutMs: number): Promise<string> — single generate() for one chunk, N+1 calls for multiple chunks in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T045 Implement loadMemoryContents(summaries: MemorySummary[], basePath: string): Promise<MemoryContent[]> — calls readMemory() per entry, wraps each in try/catch, skips failures with stderr warning, applies truncateContent in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T046 Implement buildFallbackListing(summaries: MemorySummary[]): FallbackListing[] — maps MemorySummary to { id, type, title, tags } in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T047 Implement summarize(request: SummarizeRequest): Promise<SummarizeResult> — main orchestration: check isAvailable(), dispatch to fallback or LLM path per mode in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T048 Implement per-type path in summarize(): call listMemories() with typeFilter/tags/limit, loadMemoryContents(), groupByType(), per-type mapReduceSummarize() in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T049 Implement overview path in summarize(): call listMemories() with tags/limit, loadMemoryContents(), buildChunks(), mapReduceSummarize() across flattened corpus in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T050 Implement digest path in summarize(): call readMemory(digestId), apply truncateContent, single generate() call with digest prompt template in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T051 Implement fallback path in summarize(): call listMemories() with filters, buildFallbackListing(), return SummarizeResult with memories array and hint in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T052 [P] Implement empty corpus early-return in summarize(): when listMemories() returns empty array, return success result with empty memoriesIncluded before isAvailable() check in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T053 [P] Implement multi-basePath collection in summarize(): iterate basePaths, collect MemoryContent per path, deduplicate by ID using Map<id, MemoryContent> before summarising in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T054 Run test suite for summarize.spec.ts and confirm all Phase A tests pass: bun test /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts
- [x] T055 Run full test suite to confirm no regressions: bun test /home/gareth/.vs/claude-memory-plugin

**Checkpoint**: summarize.ts fully implemented and tested. All Phase A tests pass. No regressions in existing suite.

---

## Phase B: CLI Handler Update

**Goal**: Replace `cmdSummarize` stub in `suggest.ts`. Remove two stub tests from `suggest.spec.ts` and add real tests that exercise all flags. Satisfies FR-018 (stub removal) and SC-010/SC-011.

**Maps to**: US-1, US-2, US-3, US-4, US-5, US-7, US-8

**Critical**: The two existing stub tests in `suggest.spec.ts` MUST be removed before adding real tests. They assert `'not yet implemented'` which will be false after the handler is updated.

### Tests for Phase B

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [x] T056 Remove stub tests 'returns stub response' and 'accepts type positional' from the cmdSummarize describe block in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T057 [P] [US-4] Write test: cmdSummarize returns error response when --mode digest is passed without a positional ID argument in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T058 [P] [US-5] Write test: cmdSummarize returns error response when --include-shared is passed without --agent in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T059 [P] [US-1] Write test: cmdSummarize calls summarize() with mode 'per-type' and correct basePath for default (no flags) invocation in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T060 [P] [US-1] Write test: cmdSummarize returns success CliResponse wrapping SummarizeResult from summarize() on per-type happy path in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T061 [P] [US-3] Write test: cmdSummarize calls summarize() with mode 'overview' when --mode overview flag is passed in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T062 [P] [US-4] Write test: cmdSummarize calls summarize() with mode 'digest' and digestId from positional[0] when --mode digest is passed with a positional argument in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T063 [P] [US-1] Write test: cmdSummarize passes typeFilter from positional[0] to summarize() when mode is per-type and positional arg is provided in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T064 [P] [US-7] Write test: cmdSummarize passes limit from --limit flag to summarize() in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T065 [P] [US-7] Write test: cmdSummarize passes DEFAULT_LIMIT (50) when no --limit flag is provided in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T066 [P] [US-7] Write test: cmdSummarize passes tags array parsed from --tags flag (comma-split) to summarize() in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T067 [P] [US-8] Write test: cmdSummarize passes timeoutMs from --timeout flag to summarize() in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T068 [P] [US-8] Write test: cmdSummarize passes DEFAULT_TIMEOUT_MS (120000) when no --timeout flag is provided in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T069 [P] [US-2] Write test: cmdSummarize returns success CliResponse with hint field when summarize() returns fallback result (Ollama unavailable path) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts

### Implementation for Phase B

- [x] T070 Add import for summarize function from summarize module in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T071 Add imports for validateIncludeShared and resolveSharedScopePaths from helpers in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T072 Add imports for DEFAULT_LIMIT and DEFAULT_TIMEOUT_MS constants from summarize module in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T073 Extract flags in cmdSummarize: mode (getFlagString, default 'per-type'), scope, agent, include-shared (getFlagBool), all-agents (getFlagBool), tags (getFlagString), limit (getFlagNumber, default DEFAULT_LIMIT), timeout (getFlagNumber, default DEFAULT_TIMEOUT_MS) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T074 Add --include-shared validation via validateIncludeShared() at top of cmdSummarize — return error response immediately if validation fails in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T074b Add --all-agents + --agent precedence in cmdSummarize — when both flags are present, --all-agents takes precedence and --agent is ignored (no error raised). Document with inline comment.
- [x] T075 Add --mode digest validation in cmdSummarize — return error response immediately when mode === 'digest' and positional[0] is absent in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T076 Implement single-agent basePath resolution in cmdSummarize: when agentName is set (and not all-agents), call resolveAgentScopePath(); when include-shared is also set, call resolveSharedScopePaths() for multi-path in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T077 Implement default (non-agent) basePath resolution in cmdSummarize: call getResolvedScopePath(parseScope(scopeStr)) when no agentName in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T078 Build SummarizeRequest object in cmdSummarize assembling: basePaths, mode (cast to SummarizeMode), typeFilter (positional[0] when mode !== 'digest'), digestId (positional[0] when mode === 'digest'), tags, limit, timeoutMs, agentName in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T079 Call summarize(request) and wrap result in success() CliResponse with message 'Summarize complete' in cmdSummarize in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T080 Handle fallback path in cmdSummarize: when SummarizeResult.hint is present, emit success() with fallback message 'Summarize complete (LLM unavailable — structured listing returned)' and preserve hint on CliResponse in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T081 Remove the stub TODO comment and void scope usage from cmdSummarize in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T082 Run suggest.spec.ts test suite and confirm all Phase B tests pass: bun test /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T083 Verify no 'not yet implemented' or 'stub' text remains in cmdSummarize function body in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T084 Run full test suite to confirm no regressions: bun test /home/gareth/.vs/claude-memory-plugin

**Checkpoint**: cmdSummarize stub replaced with real implementation. Two stub tests removed and replaced with real tests. No regressions. SC-010 and SC-011 satisfied.

---

## Phase C: Agent Scope and All-Agents Support

**Goal**: Implement `--agent`, `--include-shared`, and `--all-agents` basePath resolution in `cmdSummarize`. The `--agent` and `--include-shared` paths are partially introduced in Phase B; this phase adds the `--all-agents` path via `discoverAgents()`.

**Maps to**: US-5 (agent-scoped summarisation, all-agents summarisation)

### Tests for Phase C

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [x] T085 [P] [US-5] Write test: cmdSummarize calls resolveAgentScopePath() with correct agent name when --agent flag is provided (without --include-shared) in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T086 [P] [US-5] Write test: cmdSummarize calls resolveSharedScopePaths() and produces multiple basePaths when --agent and --include-shared are both provided in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T087 [P] [US-5] Write test: cmdSummarize calls discoverAgents() when --all-agents flag is provided in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T088 [P] [US-5] Write test: cmdSummarize passes multiple basePaths (one per discovered agent) to summarize() when --all-agents is provided in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T089 [P] [US-5] Write test: summarize() deduplicates memory IDs by ID when multiple basePaths are provided and a memory appears in more than one scope in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.spec.ts

### Implementation for Phase C

- [x] T090 Add import for discoverAgents from core/agent-discovery module in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T091 Implement --all-agents basePath resolution in cmdSummarize: call discoverAgents(process.cwd(), getGlobalMemoryPath()), map discovered agents to their resolved scope paths, pass resulting array as basePaths in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.ts
- [x] T092 Confirm multi-basePath deduplication is active in summarize() from T053 implementation — verify Map<id, MemoryContent> deduplication covers the --all-agents case in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/summarize/summarize.ts
- [x] T093 Run suggest.spec.ts test suite and confirm all Phase C tests pass: bun test /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/suggest.spec.ts
- [x] T094 Run full test suite to confirm no regressions: bun test /home/gareth/.vs/claude-memory-plugin

**Checkpoint**: --agent, --include-shared, and --all-agents flags fully functional. Agent namespace isolation and multi-scope deduplication working. SC-006 and SC-007 satisfied.

---

## Phase D: Help Entry Update

**Goal**: Expand `ANALYSIS_HELP.summarize` in `analysis.ts` to document all supported flags and examples. Satisfies FR-019.

**Maps to**: FR-019 (help documentation)

### Tests for Phase D

**Execute ALL tests first. Verify ALL fail before proceeding to implementation.**

- [x] T095 [P] Locate existing help spec file for analysis entries (search for analysis.spec.ts or help.spec.ts in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/command-help/)
- [x] T096 [P] Write test: ANALYSIS_HELP.summarize.flags is a non-empty string containing '--mode' in the help spec file
- [x] T097 [P] Write test: ANALYSIS_HELP.summarize.flags contains '--agent' documentation in the help spec file
- [x] T098 [P] Write test: ANALYSIS_HELP.summarize.flags contains '--all-agents' documentation in the help spec file
- [x] T099 [P] Write test: ANALYSIS_HELP.summarize.examples array contains at least 5 entries in the help spec file
- [x] T100 [P] Write test: ANALYSIS_HELP.summarize.notes is a non-empty string in the help spec file

### Implementation for Phase D

- [x] T101 Replace ANALYSIS_HELP.summarize stub in /home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/command-help/entries/analysis.ts with the full entry from contracts/summarize-api.md: usage, description, arguments, flags (--mode, --scope, --agent, --include-shared, --all-agents, --tags, --limit, --timeout), examples (7 entries), and notes
- [x] T102 Run help spec tests to confirm all Phase D tests pass
- [x] T103 Run full test suite to confirm no regressions: bun test /home/gareth/.vs/claude-memory-plugin

**Checkpoint**: ANALYSIS_HELP.summarize fully documented with all flags, examples, and notes. FR-019 satisfied.

---

## Phase E: Quickstart Validation

**Goal**: Run the 12 quickstart scenarios from `quickstart.md` to confirm all success criteria are met end-to-end. No new code is written in this phase — it is a validation pass only.

- [ ] T104 Run Scenario 1 (SC-001): memory summarize against project scope with Ollama running, confirm data.summaries has one key per type present
- [ ] T105 Run Scenario 2 (SC-003): memory summarize decision, confirm data.summaries has exactly one key 'decision' and memoriesIncluded contains only decision IDs
- [ ] T106 Run Scenario 3 (SC-002): stop Ollama, run memory summarize, confirm data.memories is present, hint is non-empty, data.summaries absent
- [ ] T107 Run Scenario 4 (SC-004): memory summarize --mode overview, confirm data.summary is a single string and data.summaries is absent
- [ ] T108 Run Scenario 5 (SC-005): memory summarize --mode digest <real-id>, confirm data.summary is present and memoriesIncluded contains exactly that one ID
- [ ] T109 Run Scenario 5 error paths: --mode digest without ID returns error; --mode digest <invalid-id> returns error 'Memory not found: <id>'
- [ ] T110 Run Scenario 6 (SC-006): memory summarize --agent <name>, confirm only agent namespace memories appear
- [ ] T111 Run Scenario 6 validation: memory summarize --include-shared (without --agent) returns error '--include-shared requires --agent flag'
- [ ] T112 Run Scenario 7 (SC-007): memory summarize --all-agents, confirm memoriesIncluded spans multiple agent namespaces
- [ ] T113 Run Scenario 8 (SC-008): memory summarize --limit 5, confirm memoriesIncluded.length <= 5
- [ ] T114 Run Scenario 9 (US-7): memory summarize --tags important, confirm only tagged memories appear in memoriesIncluded
- [x] T115 Run Scenario 11 (SC-010, SC-011): bun test confirms all existing tests pass; grep confirms 'not yet implemented' and 'stub' are absent from suggest.ts function body
- [ ] T116 Run Scenario 12 (US-8): memory summarize --timeout 60000, confirm command accepts flag without error

**Checkpoint**: All 12 quickstart scenarios validated. Feature ready for PR review.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Pre-flight)**: No dependencies — start immediately, all tasks parallelisable
- **Phase A (Core Module)**: Depends on Phase 0 — all test tasks parallelisable within test group; implementation tasks have internal ordering (types → helpers → orchestration)
- **Phase B (CLI Handler)**: Depends on Phase A — T056 (stub test removal) must precede new test additions; implementation tasks have internal ordering (imports → validation → resolution → call)
- **Phase C (Agent Scope)**: Depends on Phase B (basePath plumbing introduced in B) — tests parallelisable within test group
- **Phase D (Help Entry)**: Independent of Phase C — can run in parallel with Phase C after Phase B completes
- **Phase E (Validation)**: Depends on Phase C and Phase D completion

### Within Phase A

- T009–T035: All test tasks may run in parallel (separate describe blocks in one file)
- T037–T039: File creation and constants/types are prerequisites for all function implementations
- T040–T043: Pure helper functions, parallelisable after T037–T039
- T044: mapReduceSummarize depends on buildPrompt (T042) and buildReducePrompt (T043)
- T045: loadMemoryContents depends on truncateContent (T040)
- T047–T053: summarize() orchestration depends on all helpers above

### Within Phase B

- T056 (stub test removal) must complete before T057–T069 (new tests) — removing stubs first avoids test name conflicts
- T057–T069: New test tasks parallelisable within test group
- T070–T072: Import additions are parallelisable
- T073: Flag extraction depends on imports (T070–T072)
- T074–T075: Validation guards depend on T073
- T076–T077: basePath resolution depends on T073
- T078: SummarizeRequest assembly depends on T073–T077
- T079–T080: Delegate call depends on T078
- T081: Stub cleanup is independent

### Parallel Opportunities

- All Phase 0 tasks: parallelisable
- All Phase A test tasks (T009–T036): parallelisable
- Phase A helper implementations (T040–T043): parallelisable after T037–T039
- Phase C and Phase D: parallelisable with each other after Phase B completes
- Phase E validation scenarios: parallelisable (manual runs, no code changes)

---

## Implementation Strategy

### MVP First (US-1 + US-2 Only)

1. Complete Phase 0: Pre-flight verification
2. Complete Phase A: Core summarisation module (all modes and fallback)
3. Complete Phase B through T082: Default per-type invocation and fallback path working
4. **STOP and VALIDATE**: Run `bun test` and confirm all stub tests replaced and new tests pass
5. Run Scenario 1 and Scenario 3 from quickstart.md manually

### Incremental Delivery

1. Phase 0 + Phase A → summarize.ts fully tested in isolation
2. Phase B → cmdSummarize stub replaced, per-type/overview/digest/fallback all wired up (US-1 through US-4, US-7, US-8)
3. Phase C → Agent scope flags operational (US-5)
4. Phase D → Help entry complete (FR-019)
5. Phase E → End-to-end validation against all success criteria

---

## Notes

- [P] tasks = different files or independent operations, no blocking dependencies
- [US-n] label maps task to specific user story for traceability
- Mock pattern throughout: `vi.spyOn(module, 'functionName')` — NOT `mock.module()` or `vi.mock()` factories
- Content truncation at MAX_MEMORY_CONTENT_CHARS (6,000) is mandatory before chunking — failure to apply it causes Ollama context length errors
- positional[0] is the type filter or digest ID after command routing — test fixtures must use `positional: ['decision']` not `positional: ['summarize', 'decision']`
- The two stub tests ('returns stub response', 'accepts type positional') must be removed in T056 before adding new tests to avoid assertion conflicts
- Summaries are ephemeral — nothing is written to disk; no index or graph modifications
- Commit after each phase checkpoint
