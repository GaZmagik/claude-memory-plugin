---
phases:
  - id: A
    name: "Similarity on Edges"
    maps_to: ["US1"]
  - id: B
    name: "update-edge Command + link.ts Refactor"
    maps_to: ["US2"]
  - id: C
    name: "check-relevance Command"
    maps_to: ["US3"]
  - id: D
    name: "LLM Verification"
    maps_to: ["US4"]
---

# Tasks: v1.5.0 Memory Graph Enhancement Suite

**Feature ID**: 004
**Branch**: `feature/004-v1.5.0-memory-graph-enhancements`
**Spec**: `/home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/004-v1.5.0-memory-graph-enhancements/spec.md`
**Plan**: `/home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/004-v1.5.0-memory-graph-enhancements/plan.md`
**TDD Checklist**: `/home/gareth/.vs/claude-memory-plugin/.specify/tdd-checklist.md`

**TDD Status Reporting** (include in task completion):
```
TDD: test first? ✅/❌ | seen failing? ✅/❌ | now passing? ✅/❌
```

**Constitution constraint P2**: Within every phase, ALL test tasks are grouped before ALL implementation tasks. Interleaving is forbidden.

---

## Phase A: Similarity on Edges (User Story 1 — Priority: P1)

**Goal**: Extend `GraphEdge` and `EdgeMetadata` with `similarity?: number`, thread the cosine similarity score from `suggest-links --auto-link` through to the written edge, and clamp/validate at the write boundary.

**Spec traceability**: US-1, FR-001, FR-002, FR-003, FR-004, SC-002

**Independent Test**: Run `suggest-links --auto-link`, inspect `graph.json` — all newly created same-scope edges contain a `similarity` field in range 0–1.

### Tests for Phase A (US1)

> **NOTE: Write ALL tests first. Confirm every test FAILS before proceeding to implementation.**

- [ ] T001 [P] [US1] Write test A-T1 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/edges.spec.ts`: `addEdge()` stores `similarity` on the created edge when provided in `EdgeMetadata` — traceability: FR-001, US-1/AC-1
- [ ] T002 [P] [US1] Write test A-T2 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/edges.spec.ts`: `addEdge()` clamps similarity > 1.0 to 1.0; clamps < 0.0 to 0.0 (for internally computed values) — traceability: FR-002, US-1/AC-3
- [ ] T002a [P] [US1] Write test A-T2b in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/edges.spec.ts`: `addEdge()` rejects `similarity: NaN` with a validation error before writing any graph data (NaN is not handled by clamping) — traceability: FR-002, spec Edge Cases block
- [ ] T003 [P] [US1] Write test A-T3 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/edges.spec.ts`: duplicate detection ignores `similarity` — same `(source, target, label)` with different `similarity` values does not create a duplicate edge — traceability: FR-004, US-1/AC-2
- [ ] T004 [P] [US1] Write test A-T4 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/structure.spec.ts`: a `graph.json` without `similarity` on edges loads cleanly and produces edges with `similarity === undefined` — traceability: FR-001, US-1/AC-4
- [ ] T005 [P] [US1] Write test A-T5 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/structure.spec.ts`: a `graph.json` with `similarity: 0.87` on an edge loads and the value is accessible as `edge.similarity` — traceability: FR-001, US-1/AC-1
- [ ] T006 [P] [US1] Write test A-T6 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/suggest/suggest-links.spec.ts`: when `--auto-link` creates a same-scope edge, the resulting edge in the graph has a `similarity` field matching the computed cosine similarity — traceability: FR-003, US-1/AC-1
- [ ] T007 [P] [US1] Write test A-T7 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/suggest/suggest-links.spec.ts`: when `--auto-link` encounters a cross-scope edge candidate, the edge is NOT written with a `similarity` field (read-only constraint preserved) — traceability: FR-003, US-1 edge cases

### Implementation for Phase A (US1)

- [ ] T008 [P] [US1] Extend `GraphEdge` interface in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/structure.ts` with `similarity?: number` and JSDoc; add note about sync with `types/memory.ts` — traceability: FR-001 (A-I1)
- [ ] T009 [P] [US1] Sync `GraphEdge` in `/home/gareth/.vs/claude-memory-plugin/types/memory.ts` to add `similarity?: number` field matching `structure.ts` — traceability: FR-001 (A-I1)
- [ ] T010 [US1] Extend `EdgeMetadata` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/edges.ts` with `similarity?: number`; modify `addEdge()` to write `similarity` and clamp to `[0, 1]` defensively; keep duplicate detection predicate as `(source, target, label)` only — traceability: FR-001, FR-002, FR-004 (A-I2)
- [ ] T011 [US1] Thread `match.similarity` through `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/suggest/suggest-links.ts`: pass `similarity: match.similarity` into `LinkMemoriesRequest`/`EdgeMetadata` for same-scope edges only; skip for cross-scope candidates — traceability: FR-003 (A-I3)
- [ ] T012 [US1] Pass `similarity` through to `addEdge()` via `EdgeMetadata` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link.ts` — traceability: FR-003 (A-I3)

**Checkpoint**: Phase A complete — `suggest-links --auto-link` writes `similarity` on all new same-scope edges; existing graphs without the field load cleanly; duplicate detection is unaffected.

---

## Phase B: update-edge Command + link.ts Refactor (User Story 2 — Priority: P2)

**Goal**: Extract `updateEdgeMetadata` logic into a new `link-update.ts` module, add `verifiedRelation` to `GraphEdge`, implement the `update-edge` CLI command with `--similarity`, `--relation`, `--verify`, and `--apply` flags, and handle cross-scope edges using the dual-graph-save pattern.

**Spec traceability**: US-2, FR-005, FR-006, FR-007, FR-008, SC-003, SC-007

**Independent Test**: Create an edge with no `similarity` field, run `update-edge --similarity 0.75`, confirm the field appears on the edge in `graph.json` with all other fields unchanged.

**Prerequisite**: Phase A complete (establishes `similarity` field on `GraphEdge`).

### Tests for Phase B (US2)

> **NOTE: Write ALL tests first. Confirm every test FAILS before proceeding to implementation.**

- [ ] T013 [P] [US2] Write test B-T1 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.spec.ts` (new file): `updateEdgeMetadata()` sets `similarity: 0.75` on an existing same-scope edge; all other edge fields are unchanged — traceability: FR-006, US-2/AC-1
- [ ] T014 [P] [US2] Write test B-T2 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.spec.ts`: `updateEdgeMetadata()` rejects `similarity: 1.5` with a validation error before writing anything — traceability: FR-002, FR-006, US-2/AC-6
- [ ] T015 [P] [US2] Write test B-T3 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.spec.ts`: `updateEdgeMetadata()` rejects `similarity: NaN` with a validation error — traceability: FR-002, US-1 edge cases
- [ ] T016 [P] [US2] Write test B-T4 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.spec.ts`: `updateEdgeMetadata({ relation: "superseded-by" })` updates the edge `label` field — traceability: FR-006, US-2/AC-2
- [ ] T017 [P] [US2] Write test B-T5 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.spec.ts`: `updateEdgeMetadata({ apply: true })` on an edge with `verifiedRelation: "superseded-by"` promotes it to `label`, removes `verifiedRelation` entirely, returns `{ applied: true }` — traceability: FR-006, US-2/AC-3, SC-003
- [ ] T018 [P] [US2] Write test B-T6 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.spec.ts`: `updateEdgeMetadata({ apply: true })` on an edge with no `verifiedRelation` is a no-op returning `{ noOp: true }`; graph file is not written — traceability: FR-006, US-2/AC-4
- [ ] T018a [P] [US2] Write test B-T6b in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.spec.ts`: `updateEdgeMetadata({ apply: true })` on an edge where `verifiedRelation === label` (value already matches) promotes successfully, leaves the edge with no `verifiedRelation` field, and returns `{ applied: true }` — traceability: FR-006, spec Edge Cases block (update-edge --apply where verifiedRelation equals label)
- [ ] T019 [P] [US2] Write test B-T7 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.spec.ts`: `updateEdgeMetadata()` on a cross-scope edge updates the edge in both graph files — traceability: FR-007, US-2/AC-5
- [ ] T020 [P] [US2] Write test B-T8 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.spec.ts`: `updateEdgeMetadata()` when `sourceId` not found in any scanned graph returns an error identifying the missing ID — traceability: FR-006, US-2 edge cases
- [ ] T021 [P] [US2] Write test B-T9 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/structure.spec.ts`: `GraphEdge` with `verifiedRelation: "superseded-by"` serialises and deserialises correctly; `verifiedRelation` is absent after round-trip of edge without the field — traceability: FR-005, US-2/AC-3
- [ ] T022 [US2] Write test B-T10 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/graph.spec.ts` (CLI integration): `memory update-edge <src> <tgt> --similarity 0.75` reads the graph, mutates the edge, exits 0 — traceability: FR-006, US-2/AC-1
- [ ] T022a [P] [US2] Write test B-T11 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.spec.ts`: `updateEdgeMetadata({ verify: true, apply: true })` is rejected with a validation error before any graph read or write (mutual exclusion constraint) — traceability: FR-006, data-model.md UpdateEdgeRequest constraints

### Implementation for Phase B (US2)

- [ ] T023 [P] [US2] Extend `GraphEdge` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/structure.ts` with `verifiedRelation?: string` and JSDoc describing the staging lifecycle — traceability: FR-005 (B-I1)
- [ ] T024 [P] [US2] Sync `GraphEdge` in `/home/gareth/.vs/claude-memory-plugin/types/memory.ts` to add `verifiedRelation?: string` — traceability: FR-005 (B-I1)
- [ ] T025 [US2] Create `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.ts`: define `UpdateEdgeRequest`, `UpdateEdgeResponse` types; implement `updateEdgeMetadata()` with similarity validation (reject NaN/Infinity/out-of-range), cross-scope scan, `--apply` promotion using `delete edge.verifiedRelation`, dual-graph-save for cross-scope edges — traceability: FR-006, FR-007, FR-008 (B-I2)
- [ ] T026 [US2] Add `cmdUpdateEdge` handler to `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/graph.ts`: parse positional args `<sourceId> <targetId>` and flags `--similarity`, `--relation`, `--verify`, `--apply`, `--scope`, `--agent`, `--target-agent`; call `updateEdgeMetadata()` — traceability: FR-006 (B-I3)
- [ ] T027 [US2] Register `update-edge` command in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/index.ts` — traceability: SC-008 (B-I4)
- [ ] T028 [US2] Add `update-edge` help entry to `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/help.ts` — traceability: SC-008 (B-I4)

**Checkpoint**: Phase B complete — `memory update-edge` command functional with `--similarity`, `--relation`, `--apply`; `link.ts` remains below 600 lines (SC-007); `link-update.ts` independently importable; `--apply` leaves no `verifiedRelation` field on edge.

---

## Phase C: check-relevance Command (User Story 3 — Priority: P3)

**Goal**: Implement the `check-relevance` command with four independently testable pure scoring functions, confidence band classification, table/JSON/detailed output formats, `--auto-move` with `--confirm`, `--dry-run`, and filtering flags.

**Spec traceability**: US-3, FR-009 – FR-015, SC-004, SC-006

**Independent Test**: Run `check-relevance` against a scope containing a clearly mismatched memory — confirm it appears in the output with Low or None confidence band.

**Prerequisite**: Phase A and B complete (stable codebase baseline; uses `loadMergedGraph()`, `moveMemory()` from existing infrastructure).

### Tests for Phase C (US3)

> **NOTE: Write ALL tests first. Confirm every test FAILS before proceeding to implementation.**

- [ ] T029 [P] [US3] Write test C-T1 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts` (new file): `scoreTypeMatch()` returns 30 for a memory whose type is well-matched to its scope; returns 0 for a type never associated with that scope — traceability: FR-009, SC-006, US-3/AC-1
- [ ] T030 [P] [US3] Write test C-T2 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: `scoreTagHeuristics()` returns 25 for tags strongly suggesting the current scope; returns 0 for tags exclusively associated with a different scope — traceability: FR-009, SC-006, US-3/AC-1
- [ ] T031 [P] [US3] Write test C-T3 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: `scoreGraphConnectivity()` returns 25 when all edges connect to memories in the same scope; returns 0 when all edges connect to different scopes — traceability: FR-009, SC-006, US-3/AC-1
- [ ] T032 [P] [US3] Write test C-T4 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: `scoreContentAnalysis()` returns 20 for content strongly matching scope conventions; returns 0 for content with no matching signals — traceability: FR-009, SC-006, US-3/AC-1
- [ ] T033 [P] [US3] Write test C-T5 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: total score is sum of all four components; boundary cases score 80 → High, 79 → Medium, 59 → Low, 39 → None — traceability: FR-010, US-3/AC-1, US-3/AC-2
- [ ] T034 [P] [US3] Write test C-T6 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: memory with all four components scoring their maximum returns score ≥ 80 (High band) and does not appear as a migration candidate — traceability: US-3/AC-1
- [ ] T035 [P] [US3] Write test C-T7 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: memory with all four components scoring 0 returns score < 40 (None band) with a suggested target scope — traceability: US-3/AC-2
- [ ] T036 [P] [US3] Write test C-T8 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: `--format json` produces valid JSON with required fields: `id`, `currentScope`, `suggestedScope`, `totalScore`, `confidenceBand` — traceability: FR-011, US-3/AC-4
- [ ] T037 [P] [US3] Write test C-T9 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: `--auto-move` without `--confirm` exits with a non-zero status code (assert `process.exitCode !== 0` or equivalent), prints a warning to stderr, and leaves all graph files and memory files unmodified — traceability: FR-012, US-3/AC-6
- [ ] T038 [P] [US3] Write test C-T10 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: `--auto-move --confirm` moves High-band memories only (score ≥ 80) when no `--threshold` is set — traceability: FR-012, US-3/AC-7
- [ ] T039 [P] [US3] Write test C-T11 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: `--auto-move --confirm --threshold 60` moves memories scoring ≥ 60 (Medium + High bands) — traceability: FR-014, US-3/AC-8
- [ ] T040 [P] [US3] Write test C-T12 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: `--dry-run --auto-move` prints what would move without modifying any files — traceability: FR-013, US-3/AC-5
- [ ] T041 [P] [US3] Write test C-T13 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: `--type learning` restricts scoring to `learning` memories only — traceability: FR-014, US-3/AC-9
- [ ] T041a [P] [US3] Write test C-T13b in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: `--agent <name>` restricts scoring to memories in the named agent's namespace only; memories from other agents and from project/global scopes are excluded — traceability: FR-014, US-3/AC-10
- [ ] T042 [P] [US3] Write test C-T14 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: empty scope (zero memories) exits cleanly with a message — traceability: US-3 edge cases
- [ ] T042a [P] [US3] Write test C-T16 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: `--auto-move --confirm` when the target scope directory has no `graph.json` creates the necessary directory structure and graph file, consistent with `memory move` behaviour — traceability: US-3 edge cases (spec Edge Cases block)
- [ ] T043 [P] [US3] Write test C-T15 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.spec.ts`: type, tag, and connectivity scoring components do NOT read memory file content (performance constraint — assert no file I/O calls in those paths) — traceability: FR-015, SC-004

### Implementation for Phase C (US3)

- [ ] T044 [P] [US3] Implement `scoreTypeMatch(type: MemoryType, scope: string): number` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.ts` (new file): pure function, no I/O, returns 0–30 — traceability: FR-009 (C-I1)
- [ ] T045 [P] [US3] Implement `scoreTagHeuristics(tags: string[], scope: string): number` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.ts`: pure function, returns 0–25 — traceability: FR-009 (C-I2)
- [ ] T046 [P] [US3] Implement `scoreGraphConnectivity(memoryId: string, graph: MemoryGraph, scope: string): number` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.ts`: uses `getInboundEdges()`/`getOutboundEdges()` from `edges.ts`, pure function, returns 0–25 — traceability: FR-009 (C-I3)
- [ ] T047 [P] [US3] Implement `scoreContentAnalysis(content: string, scope: string): number` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.ts`: pure function, keyword and length heuristics only (no NLP library), returns 0–20 — traceability: FR-009 (C-I4)
- [ ] T048 [P] [US3] Implement `classifyConfidenceBand(score: number): ConfidenceBand` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.ts`: pure function, boundaries ≥80 → High, 60–79 → Medium, 40–59 → Low, <40 → None — traceability: FR-010 (C-I5)
- [ ] T049 [US3] Implement `checkRelevance(options: CheckRelevanceOptions): Promise<RelevanceScore[]>` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.ts`: uses `loadMergedGraph()` for scope loading, `loadIndex()` for type/tag data, applies filters (`--pattern`, `--type`, `--tag`, `--agent`), omits content loading unless `--format detailed` — traceability: FR-009, FR-014, FR-015 (C-I6)
- [ ] T050 [P] [US3] Implement `formatTable(results: RelevanceScore[]): string` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.ts`: human-readable, minimum 80-column width — traceability: FR-011 (C-I7)
- [ ] T051 [P] [US3] Implement `formatJson(results: RelevanceScore[]): string` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.ts`: valid JSON output — traceability: FR-011 (C-I7)
- [ ] T052 [US3] Implement `--auto-move` logic in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/maintenance/check-relevance.ts`: check for `--confirm`; if absent, print warning and exit non-zero; if present, call `moveMemory()` for each High-band result (or `--threshold` override); honour `--dry-run` — traceability: FR-012, FR-013 (C-I8)
- [ ] T053 [US3] Add `cmdCheckRelevance` handler to `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/commands/utility.ts`: parse all flags and call `checkRelevance()` — traceability: FR-009 (C-I9)
- [ ] T054 [US3] Register `check-relevance` command in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/index.ts` — traceability: SC-008 (C-I10)
- [ ] T055 [US3] Add `check-relevance` help entry to `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/cli/help.ts` — traceability: SC-008 (C-I10)

**Checkpoint**: Phase C complete — `memory check-relevance` command functional with all output formats, filtering flags, `--auto-move --confirm`, and `--dry-run`; completes in under 5 seconds for 200 memories without `--format detailed` (SC-004); 100% coverage of all four scoring functions (SC-006).

---

## Phase D: LLM Verification (User Story 4 — Priority: P4)

**Goal**: Create the memory-skill-local Ollama service, add `--llm-type` to `suggest-links`, add `--verify` to `update-edge`, and ensure graceful degradation when Ollama is unavailable.

**Spec traceability**: US-4, FR-016, FR-017, FR-018, FR-019, SC-005

**Independent Test**: Run `suggest-links --auto-link --llm-type` against two memories; inspect resulting edge in `graph.json` — confirm `verifiedRelation` field is present (or absent with clear log message when Ollama is unavailable).

**Prerequisite**: Phase B complete (establishes `verifiedRelation` lifecycle in `link-update.ts`).

### Tests for Phase D (US4)

> **NOTE: Write ALL tests first. Confirm every test FAILS before proceeding to implementation.**

- [ ] T056 [P] [US4] Write test D-T1 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/services/ollama.spec.ts` (new file): `isAvailable()` returns `false` without throwing when Ollama is not running (mock the HTTP call) — traceability: FR-016, SC-005, US-4/AC-2
- [ ] T057 [P] [US4] Write test D-T2 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/services/ollama.spec.ts`: `generate()` returns an empty string and does not throw when Ollama times out (mock a 16-second delay against a 15-second timeout) — traceability: FR-017, US-4 edge cases
- [ ] T058 [P] [US4] Write test D-T3 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/services/ollama.spec.ts`: `generate()` returns the LLM response string when Ollama responds within timeout — traceability: FR-016, US-4/AC-1
- [ ] T059 [P] [US4] Write test D-T4 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/services/ollama.spec.ts`: `configureClient()` with a custom host changes the endpoint used by subsequent `generate()` calls — traceability: FR-016
- [ ] T060 [P] [US4] Write test D-T5 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/services/ollama.spec.ts`: module does not import anything from `hooks/`; import tree is self-contained within `skills/memory/` — traceability: FR-016
- [ ] T061 [P] [US4] Write test D-T6 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/suggest/suggest-links.spec.ts`: with `--auto-link --llm-type` and Ollama mocked as available, newly created same-scope edges contain both `label` and `verifiedRelation` — traceability: FR-018, US-4/AC-1, US-4/AC-3, US-4/AC-4
- [ ] T062 [P] [US4] Write test D-T7 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/suggest/suggest-links.spec.ts`: with `--auto-link --llm-type` and Ollama mocked as unavailable, edges are written with `label` only; a warning is printed to stderr; command exits 0 — traceability: FR-018, US-4/AC-2, SC-005
- [ ] T063 [P] [US4] Write test D-T8 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/suggest/suggest-links.spec.ts`: `--auto-link --llm-type` skips LLM verification for cross-scope edge candidates (not written with `verifiedRelation`) — traceability: FR-018, US-4 edge cases
- [ ] T064 [P] [US4] Write test D-T9 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.spec.ts`: `updateEdgeMetadata({ verify: true })` with Ollama available stores the LLM result as `verifiedRelation` on the edge — traceability: FR-019, US-4/AC-6
- [ ] T065 [P] [US4] Write test D-T10 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.spec.ts`: `updateEdgeMetadata({ verify: true })` with Ollama unavailable prints a warning to stderr and exits without modifying `verifiedRelation` — traceability: FR-019, US-4/AC-2, SC-005
- [ ] T065a [US4] Write integration test D-T11 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.spec.ts`: full `--llm-type → --apply` lifecycle — (1) create edge via `suggest-links --auto-link --llm-type` with Ollama mocked, confirming `verifiedRelation` is present; (2) call `updateEdgeMetadata({ apply: true })`, confirming `label` is promoted and `verifiedRelation` is fully removed — traceability: US-4/AC-5, US-2/AC-3, FR-005, FR-018, FR-019

### Implementation for Phase D (US4)

- [X] T066 [US4] Add `ollama` to the `dependencies` field in `/home/gareth/.vs/claude-memory-plugin/skills/memory/package.json`, then run `bun install` in the `skills/memory/` directory to update the lockfile. This is a manual chore step; commit the updated `package.json` and `bun.lockb` together before proceeding to T067 — traceability: FR-016 (D-I1)
- [X] T067 [US4] Create `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/services/ollama.ts`: expose `generate(prompt: string, model?: string): Promise<string>`, `isAvailable(): Promise<boolean>`, `configureClient(host: string): void`; read `chat_model` from `.claude/memory.local.md` YAML front-matter; default model `gemma3:4b`; timeout `15_000ms`; no retry logic; return `''` on timeout/error with stderr log; no import from `hooks/` — traceability: FR-016, FR-017 (D-I2)
- [X] T068 [US4] Add `--llm-type` flag handling to `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/suggest/suggest-links.ts`: when `--auto-link` and `--llm-type` are both set, call `services/ollama.generate()` after computing `label`, store trimmed response as `verifiedRelation` on same-scope edges via `addEdge()` metadata; skip cross-scope candidates; degrade gracefully when `isAvailable()` returns `false` — traceability: FR-018 (D-I3)
- [X] T069 [US4] Add `--verify` path to `updateEdgeMetadata()` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link-update.ts`: call `services/ollama.generate()` with the edge's current `label` as context; store trimmed result as `verifiedRelation`; degrade gracefully if Ollama unavailable — traceability: FR-019 (D-I4)

**Checkpoint**: Phase D complete — `suggest-links --auto-link --llm-type` writes `verifiedRelation` on same-scope edges when Ollama is available; `update-edge --verify` backfills `verifiedRelation` on existing edges; both operations degrade gracefully (exit 0 with stderr warning) when Ollama is unavailable (SC-005); `services/ollama.ts` has no `hooks/` imports.

---

## Phase E: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, version bump, and final validation across all user stories.

- [X] T070 [P] Bump version to `1.5.0` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/package.json` — traceability: SC-008, P6
- [X] T071 [P] Update README in `/home/gareth/.vs/claude-memory-plugin/skills/memory/README.md` to document `update-edge`, `check-relevance`, and `suggest-links --llm-type` commands — traceability: SC-008
- [X] T072 [P] Verify `link.ts` line count remains below 600 in `/home/gareth/.vs/claude-memory-plugin/skills/memory/src/graph/link.ts` — traceability: SC-007
- [X] T073 Run full test suite via `bun test` in `/home/gareth/.vs/claude-memory-plugin/skills/memory/` and confirm all tests pass — traceability: SC-001 (test graph: 100 project-scoped memories with at least 20 edges, no agent-scoped memories)
- [X] T073a Verify `/home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/004-v1.5.0-memory-graph-enhancements/quickstart.md` exists and is complete before proceeding to T074 — traceability: F18 (artefact pre-check)
- [X] T074 Follow all steps in `/home/gareth/.vs/claude-memory-plugin/.specify/specs/feature/004-v1.5.0-memory-graph-enhancements/quickstart.md`: run per-phase test commands, verify key files exist, and execute smoke tests for `update-edge`, `check-relevance`, and `suggest-links --llm-type` — traceability: SC-001, SC-008

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase A (US1) — No upstream dependencies; starts immediately
     |
     v
Phase B (US2) — Depends on Phase A (GraphEdge.similarity established)
     |
     v
Phase C (US3) — Depends on Phase A + B stable baseline; uses existing infrastructure
     |
     v
Phase D (US4) — Depends on Phase B (verifiedRelation lifecycle established)
     |
     v
Phase E — Depends on all phases complete
```

**Note**: Phase C and Phase D have no dependency on each other and can proceed in parallel once Phase B is complete.

### User Story Dependencies

- **US1 (P1)**: No dependencies — start immediately
- **US2 (P2)**: Depends on US1 (uses `GraphEdge.similarity`; must not grow `link.ts` before extraction)
- **US3 (P3)**: Depends on US1 + US2 stable; builds on `loadMergedGraph()`, `moveMemory()` (existing v1.4.0 infrastructure)
- **US4 (P4)**: Depends on US2 (`verifiedRelation` lifecycle in `link-update.ts`)

### Within Each Phase

1. Complete ALL test tasks in the Tests subsection first
2. Verify ALL tests fail for the expected reason
3. Then proceed to the Implementation subsection
4. Each implementation task should make its corresponding test(s) pass

### Parallel Opportunities

Within Phase A:
- T001–T007 (all test writing tasks) can be executed in parallel — different test cases, same two spec files
- T008 and T009 can be executed in parallel (different files: `structure.ts` and `types/memory.ts`)
- T011 and T012 have a logical dependency (suggest-links threads through to link.ts)

Within Phase B:
- T013–T021 (test writing) can be executed in parallel — all target `link-update.spec.ts` cases
- T023 and T024 can be executed in parallel (different files)
- T027 and T028 can be executed in parallel (different files)

Within Phase C:
- T029–T043 (test writing) can be executed in parallel — all target `check-relevance.spec.ts`
- T044–T048 (pure scoring functions) can be implemented in parallel — no interdependencies
- T050 and T051 (formatters) can be implemented in parallel
- T054 and T055 can be implemented in parallel

Within Phase D:
- T056–T065 (all test writing tasks) can be executed in parallel
- T067 depends on T066 (package installed before module created)
- T068 and T069 can be implemented in parallel (different files)

---

## Execution Strategy Recommendation

### MVP First (US1 Only)

1. Complete Phase A tests (T001–T007)
2. Confirm all Phase A tests fail
3. Complete Phase A implementation (T008–T012)
4. **STOP and VALIDATE**: `suggest-links --auto-link` writes similarity fields; existing graphs load cleanly
5. Deploy/demo if ready

### Incremental Delivery (Recommended for a single developer)

1. Phase A → validate US1 independently
2. Phase B → validate US2 independently (`update-edge` functional)
3. Phase C → validate US3 independently (`check-relevance` functional)
4. Phase D → validate US4 independently (LLM verification functional)
5. Phase E → polish and release

### Parallel Strategy (Two developers)

After Phase B is complete:
- Developer A: Phase C (`check-relevance`)
- Developer B: Phase D (LLM verification)
Both merge to feature branch independently; Phase E integrates.

---

## Notes

Cross-cutting concerns not already covered in phase-level NOTE blocks:

- Use `mock.module()` not `vi.mock()` — this codebase uses Bun test, not Vitest (repeated here as a session-start reminder; also in plan.md Technical Context)
- `hooks/` and `skills/memory/` are independent packages; no cross-package imports in either direction
- All new edge fields (`similarity`, `verifiedRelation`) are optional; existing `graph.json` files require no migration
- The `--apply` promotion path uses `delete edge.verifiedRelation` (not set-to-undefined) to ensure clean JSON serialisation — see Phase B checkpoint and Risks table in plan.md
