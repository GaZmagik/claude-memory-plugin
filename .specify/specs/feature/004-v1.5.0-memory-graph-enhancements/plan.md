# Implementation Plan: v1.5.0 Memory Graph Enhancement Suite

**Feature ID**: 004
**Branch**: `feature/004-v1.5.0-memory-graph-enhancements`
**Created**: 2026-02-18
**Status**: Draft
**Spec**: `.specify/specs/feature/004-v1.5.0-memory-graph-enhancements/spec.md`

---

## Technical Context

**Runtime**: TypeScript on Bun
**Test framework**: Bun test (`bun:test`) — use `mock.module()`, not `vi.mock()`
**Package boundary**: `skills/memory/` and `hooks/` are independent packages; no cross-package
imports in either direction

**Technology stack**:

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Language | TypeScript (strict) | Existing codebase standard |
| Runtime | Bun | Existing codebase standard |
| LLM client | `ollama-js` (add to `skills/memory/package.json`) | Already in `hooks/package.json`; no version conflict risk |
| Graph I/O | Existing `loadGraph` / `saveGraph` / `addEdge` | No new persistence layer |
| Similarity scoring | Existing `cosineSimilarity()` in `search/similarity.ts` | Already normalised 0–1; no new library |
| Multi-scope loading | Existing `loadMergedGraph()` in `graph/structure.ts` | Reused by check-relevance |
| Memory moves | Existing `moveMemory()` in `maintenance/move.ts` | Reused by check-relevance `--auto-move` |

**Architecture**: Incremental extension of existing data structures and extraction of a new module.
No new abstraction layers. Each new file delivers independent, independently testable value (P5).

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| **P1 — Plugin Architecture Compliance** | Pass | All new files reside inside `skills/memory/src/`; plugin structure unchanged |
| **P2 — Test-First Development** | Pass | All phases: tests grouped before implementation; no interleaving |
| **P3 — GitHub Flow Discipline** | Pass | All work on `feature/004-v1.5.0-memory-graph-enhancements`; merge via PR |
| **P4 — Observability & Debuggability** | Pass | Ollama unavailability produces clear stderr warnings (FR-016, FR-017, FR-018, FR-019) |
| **P5 — Simplicity & YAGNI** | Pass | No shared Ollama package; no `llmConfidence` field; content scoring uses keyword heuristics not NLP |
| **P6 — Semantic Versioning** | Pass | Minor version bump (1.4.x → 1.5.0); no breaking changes; all new edge fields are optional |

---

## Implementation Sequence

The four features are implemented in dependency order for minimal risk:

```
Phase A — Feature 2: Similarity on edges          (FR-001, FR-002, FR-003, FR-004)
     ↓  (establishes EdgeMetadata.similarity and GraphEdge.similarity)
Phase B — Feature 4: update-edge + link.ts refactor (FR-005, FR-006, FR-007, FR-008)
     ↓  (establishes verifiedRelation lifecycle; link-update.ts extracted)
Phase C — Feature 1: check-relevance               (FR-009 – FR-015)
     ↓  (independent of data enrichment track technically; waits for A+B stable baseline in practice to avoid branch conflicts)
Phase D — Feature 3: LLM verification              (FR-016, FR-017, FR-018, FR-019)
     ↓  (depends on services/ollama.ts; verifiedRelation lifecycle from Phase B)
```

---

## Phase A — Similarity on Edges (User Story 1)

**Spec traceability**: US-1, FR-001, FR-002, FR-003, FR-004, SC-002

**Goal**: Extend `GraphEdge` and `EdgeMetadata` with `similarity?: number`, thread the cosine
similarity score from `suggest-links` through to the written edge, and clamp/validate at the
write boundary.

**Files created**: none
**Files modified**:
- `skills/memory/src/graph/structure.ts` — add `similarity?` to `GraphEdge`
- `skills/memory/src/graph/edges.ts` — add `similarity?` to `EdgeMetadata`; clamp in `addEdge()`
- `skills/memory/src/suggest/suggest-links.ts` — thread `match.similarity` to `linkMemories()`
- `skills/memory/src/graph/link.ts` — pass `similarity` through to `addEdge()` via `EdgeMetadata`
- `types/memory.ts` — keep `GraphEdge` documentation layer in sync
- `skills/memory/src/graph/structure.spec.ts` — new tests for similarity field load/save
- `skills/memory/src/graph/edges.spec.ts` — new tests for clamping and duplicate detection

**Complexity**: Low. Pure data-model extension. No new files. No new dependencies.

### Phase A Tests (all must be written and seen failing before implementation begins)

**A-T1** — `edges.spec.ts`: `addEdge()` stores `similarity` on the created edge when provided in
`EdgeMetadata`.
- _Traceability_: FR-001, US-1/AC-1

**A-T2** — `edges.spec.ts`: `addEdge()` clamps similarity `> 1.0` to `1.0`; clamps `< 0.0` to
`0.0`.
- _Traceability_: FR-002, US-1/AC-3

**A-T3** — `edges.spec.ts`: duplicate detection ignores `similarity` — two calls with the same
`(source, target, label)` but different `similarity` values do not create a duplicate edge.
- _Traceability_: FR-004, US-1/AC-2

**A-T4** — `structure.spec.ts`: a `graph.json` without `similarity` on edges loads cleanly and
produces edges with `similarity === undefined`.
- _Traceability_: FR-001, US-1/AC-4

**A-T5** — `structure.spec.ts`: a `graph.json` with `similarity: 0.87` on an edge loads and the
value is accessible as `edge.similarity`.
- _Traceability_: FR-001, US-1/AC-1

**A-T6** — `suggest-links.spec.ts`: when `--auto-link` creates a same-scope edge, the resulting
edge in the graph has a `similarity` field matching the computed cosine similarity.
- _Traceability_: FR-003, US-1/AC-1

**A-T7** — `suggest-links.spec.ts`: when `--auto-link` encounters a cross-scope edge candidate,
the edge is NOT written with a `similarity` field (existing read-only constraint preserved).
- _Traceability_: FR-003, US-1 edge cases

### Phase A Implementation (after all A-T tests are written and confirmed failing)

**A-I1** — Extend `GraphEdge` interface in `structure.ts` with `similarity?: number` and add JSDoc.
Keep comment noting sync requirement with `types/memory.ts`. Update `types/memory.ts` to match.
- _Files_: `skills/memory/src/graph/structure.ts`, `types/memory.ts`
- _Traceability_: FR-001

**A-I2** — Extend `EdgeMetadata` in `edges.ts` with `similarity?: number`. Modify `addEdge()` to:
(a) write `similarity` onto the edge when present in metadata, (b) clamp to `[0, 1]` defensively.
Duplicate detection predicate remains `(source, target, label)` only.
- _Files_: `skills/memory/src/graph/edges.ts`
- _Traceability_: FR-001, FR-002, FR-004

**A-I3** — Thread `match.similarity` through `suggest-links.ts`. In the auto-link scoring loop,
pass `similarity: match.similarity` into the `LinkMemoriesRequest` / `EdgeMetadata` that reaches
`linkMemories()`. Same-scope edges only; skip for cross-scope candidates.
- _Files_: `skills/memory/src/suggest/suggest-links.ts`, `skills/memory/src/graph/link.ts`
- _Traceability_: FR-003

---

## Phase B — update-edge Command + link.ts Refactor (User Story 2)

**Spec traceability**: US-2, FR-005, FR-006, FR-007, FR-008, SC-003, SC-007

> **Note on FR-019**: The `--verify` path in `updateEdgeMetadata()` (introduced in Phase B via `link-update.ts`) provides the scaffolding for FR-019's behaviour. The Ollama call itself is wired in Phase D (D-I4). FR-019 traceability therefore spans Phase B (module skeleton) and Phase D (LLM integration).

**Goal**: Extract `updateEdgeMetadata` logic from `link.ts` into a new `link-update.ts` module,
add the `verifiedRelation` field to `GraphEdge`, implement the `update-edge` CLI command with
`--similarity`, `--relation`, `--verify`, and `--apply` flags, and handle cross-scope edges
using the existing dual-graph-save pattern.

**Files created**:
- `skills/memory/src/graph/link-update.ts` — `updateEdgeMetadata()` and types
- `skills/memory/src/graph/link-update.spec.ts` — unit tests for `updateEdgeMetadata()`

**Files modified**:
- `skills/memory/src/graph/structure.ts` — add `verifiedRelation?` to `GraphEdge`
- `skills/memory/src/graph/edges.ts` — no change (verifiedRelation not in EdgeMetadata)
- `skills/memory/src/cli/commands/graph.ts` — add `cmdUpdateEdge` handler (353 lines → ~430)
- `skills/memory/src/cli/index.ts` — register `update-edge` command
- `types/memory.ts` — sync `GraphEdge`

**Complexity**: Medium. New file extraction; cross-scope scan logic; `--apply` mutation with clean
removal of `verifiedRelation`.

### Phase B Tests (all must be written and seen failing before implementation begins)

**B-T1** — `link-update.spec.ts`: `updateEdgeMetadata()` sets `similarity: 0.75` on an existing
same-scope edge; all other edge fields are unchanged.
- _Traceability_: FR-006, US-2/AC-1

**B-T2** — `link-update.spec.ts`: `updateEdgeMetadata()` rejects `similarity: 1.5` with a
validation error before writing anything.
- _Traceability_: FR-002, FR-006, US-2/AC-6

**B-T3** — `link-update.spec.ts`: `updateEdgeMetadata()` rejects `similarity: NaN` with a
validation error.
- _Traceability_: FR-002, US-1 edge cases

**B-T4** — `link-update.spec.ts`: `updateEdgeMetadata({ relation: "superseded-by" })` updates
the edge `label` field.
- _Traceability_: FR-006, US-2/AC-2

**B-T5** — `link-update.spec.ts`: `updateEdgeMetadata({ apply: true })` on an edge with
`verifiedRelation: "superseded-by"` promotes it to `label`, removes `verifiedRelation` entirely,
and returns `{ applied: true }` in the response.
- _Traceability_: FR-006, US-2/AC-3, SC-003

**B-T6** — `link-update.spec.ts`: `updateEdgeMetadata({ apply: true })` on an edge with no
`verifiedRelation` is a no-op (returns `{ noOp: true }`); graph file is not written.
- _Traceability_: FR-006, US-2/AC-4

**B-T7** — `link-update.spec.ts`: `updateEdgeMetadata()` on a cross-scope edge updates the edge
in both graph files.
- _Traceability_: FR-007, US-2/AC-5

**B-T8** — `link-update.spec.ts`: `updateEdgeMetadata()` when `sourceId` is not found in any
scanned graph returns an error identifying the missing ID.
- _Traceability_: FR-006, US-2 edge cases

**B-T9** — `structure.spec.ts`: `GraphEdge` with `verifiedRelation: "superseded-by"` serialises
and deserialises correctly; `verifiedRelation` is absent after an edge without the field is
round-tripped.
- _Traceability_: FR-005, US-2/AC-3

**B-T10** — `graph.spec.ts` (CLI integration): `memory update-edge <src> <tgt> --similarity 0.75`
reads the graph, mutates the edge, and exits 0.
- _Traceability_: FR-006, US-2/AC-1

### Phase B Implementation (after all B-T tests are written and confirmed failing)

**B-I1** — Extend `GraphEdge` in `structure.ts` with `verifiedRelation?: string` and JSDoc
describing the staging lifecycle. Sync `types/memory.ts`.
- _Files_: `skills/memory/src/graph/structure.ts`, `types/memory.ts`
- _Traceability_: FR-005

**B-I2** — Create `skills/memory/src/graph/link-update.ts`. Define `UpdateEdgeRequest`,
`UpdateEdgeResponse` types. Implement `updateEdgeMetadata()`:
  - Validate `similarity` (reject NaN/Infinity; reject out-of-range; no silent clamp for explicit
    user-supplied values — return error)
  - Scan `basePath` and optional `crossScopeBasePaths: string[]` for edges matching `(sourceId, targetId)` — see `data-model.md` `UpdateEdgeRequest` for the full type definition
  - Apply `similarity`, `relation`, `verifiedRelation` (for `--verify`) or perform `--apply`
    promotion (set `label = verifiedRelation`, delete `verifiedRelation` key)
  - Use dual-graph-save pattern for cross-scope edges (consistent with `storeCrossScopeEdge`)
- _Files_: `skills/memory/src/graph/link-update.ts`
- _Traceability_: FR-006, FR-007, FR-008

**B-I3** — Add `cmdUpdateEdge` handler to `skills/memory/src/cli/commands/graph.ts`. Parse
positional args `<sourceId> <targetId>` and flags `--similarity`, `--relation`, `--verify`,
`--apply`, `--scope`, `--agent`, `--target-agent`. Call `updateEdgeMetadata()`.
- _Files_: `skills/memory/src/cli/commands/graph.ts`
- _Traceability_: FR-006

**B-I4** — Register `update-edge` in `skills/memory/src/cli/index.ts` and add help entry.
- _Files_: `skills/memory/src/cli/index.ts`, `skills/memory/src/cli/help.ts`
- _Traceability_: SC-008

---

## Phase C — check-relevance Command (User Story 3)

**Spec traceability**: US-3, FR-009 – FR-015, SC-004, SC-006

**Goal**: Implement the `check-relevance` command with four independently testable pure scoring
functions, confidence band classification, table/JSON/detailed output formats, `--auto-move`
with `--confirm`, `--dry-run`, and filtering flags.

**Files created**:
- `skills/memory/src/maintenance/check-relevance.ts` — scoring engine and main function
- `skills/memory/src/maintenance/check-relevance.spec.ts` — unit and integration tests

**Files modified**:
- `skills/memory/src/cli/commands/utility.ts` — add `cmdCheckRelevance` handler
- `skills/memory/src/cli/index.ts` — register `check-relevance` command
- `skills/memory/src/cli/help.ts` — add help entry

**Complexity**: Medium-high. Four scoring functions; multi-format output; auto-move integration;
filtering; performance constraint (< 5 s for 200 memories without content loading).

> **Prerequisite note**: `check-relevance` has no technical dependency on the data enrichment track (it builds on `loadMergedGraph()` and `moveMemory()` from v1.4.0 infrastructure). However, tasks.md sequences it after Phase A + B to maintain a stable baseline and avoid branch merge conflicts. A two-developer team could run Phase C in parallel with Phase A/B after the `GraphEdge` type stabilises.

### Phase C Tests (all must be written and seen failing before implementation begins)

**C-T1** — `check-relevance.spec.ts`: `scoreTypeMatch()` returns 30 for a memory whose type is
well-matched to its scope; returns 0 for a type never associated with that scope.
- _Traceability_: FR-009, SC-006, US-3/AC-1

**C-T2** — `check-relevance.spec.ts`: `scoreTagHeuristics()` returns 25 for tags that strongly
suggest the current scope; returns 0 for tags exclusively associated with a different scope.
- _Traceability_: FR-009, SC-006, US-3/AC-1

**C-T3** — `check-relevance.spec.ts`: `scoreGraphConnectivity()` returns 25 when all edges
connect to memories in the same scope; returns 0 when all edges connect to different scopes.
- _Traceability_: FR-009, SC-006, US-3/AC-1

**C-T4** — `check-relevance.spec.ts`: `scoreContentAnalysis()` returns 20 for content strongly
matching scope conventions; returns 0 for content with no matching signals.
- _Traceability_: FR-009, SC-006, US-3/AC-1

**C-T5** — `check-relevance.spec.ts`: total score is the sum of all four components; boundary
case score 80 → `High`, score 79 → `Medium`, score 59 → `Low`, score 39 → `None`.
- _Traceability_: FR-010, US-3/AC-1, US-3/AC-2

**C-T6** — `check-relevance.spec.ts`: a memory with all four components scoring their max for the
current scope returns score ≥ 80 (High band) and does not appear as a migration candidate.
- _Traceability_: US-3/AC-1

**C-T7** — `check-relevance.spec.ts`: a memory with all four components scoring 0 returns score
< 40 (None band) with a suggested target scope.
- _Traceability_: US-3/AC-2

**C-T8** — `check-relevance.spec.ts`: `--format json` produces valid JSON with required fields
(id, currentScope, suggestedScope, totalScore, confidenceBand).
- _Traceability_: FR-011, US-3/AC-4

**C-T9** — `check-relevance.spec.ts`: `--auto-move` without `--confirm` exits with non-zero
status and does not modify any files.
- _Traceability_: FR-012, US-3/AC-6

**C-T10** — `check-relevance.spec.ts`: `--auto-move --confirm` moves High-band memories only
(score ≥ 80) when no `--threshold` is set.
- _Traceability_: FR-012, US-3/AC-7

**C-T11** — `check-relevance.spec.ts`: `--auto-move --confirm --threshold 60` moves memories
scoring ≥ 60 (Medium + High bands).
- _Traceability_: FR-014, US-3/AC-8

**C-T12** — `check-relevance.spec.ts`: `--dry-run --auto-move` prints what would move without
modifying any files.
- _Traceability_: FR-013, US-3/AC-5

**C-T13** — `check-relevance.spec.ts`: `--type learning` restricts scoring to `learning` memories
only.
- _Traceability_: FR-014, US-3/AC-9

**C-T14** — `check-relevance.spec.ts`: empty scope (zero memories) exits cleanly with a message.
- _Traceability_: US-3 edge cases

**C-T15** — `check-relevance.spec.ts`: type, tag, and connectivity scoring components do NOT read
memory file content (performance constraint).
- _Traceability_: FR-015, SC-004

### Phase C Implementation (after all C-T tests are written and confirmed failing)

**C-I1** — Implement `scoreTypeMatch(type: MemoryType, scope: string): number` in
`check-relevance.ts`. Pure function; no I/O. Returns 0–30.
- _Files_: `skills/memory/src/maintenance/check-relevance.ts`
- _Traceability_: FR-009

**C-I2** — Implement `scoreTagHeuristics(tags: string[], scope: string): number`. Pure function.
Returns 0–25.
- _Files_: `skills/memory/src/maintenance/check-relevance.ts`
- _Traceability_: FR-009

**C-I3** — Implement `scoreGraphConnectivity(memoryId: string, graph: MemoryGraph, scope: string): number`.
Uses `getInboundEdges()` / `getOutboundEdges()` from `edges.ts`. Pure function. Returns 0–25.
- _Files_: `skills/memory/src/maintenance/check-relevance.ts`
- _Traceability_: FR-009

**C-I4** — Implement `scoreContentAnalysis(content: string, scope: string): number`. Pure
function; receives pre-loaded content string (caller decides when to load). Returns 0–20.
Keyword and length heuristics only — no NLP library (P5).
- _Files_: `skills/memory/src/maintenance/check-relevance.ts`
- _Traceability_: FR-009

**C-I5** — Implement `classifyConfidenceBand(score: number): ConfidenceBand`. Pure function.
Boundary: ≥80 → High, 60–79 → Medium, 40–59 → Low, <40 → None.
- _Files_: `skills/memory/src/maintenance/check-relevance.ts`
- _Traceability_: FR-010

**C-I6** — Implement `checkRelevance(options: CheckRelevanceOptions): Promise<RelevanceScore[]>`.
Uses `loadMergedGraph()` for scope loading, `loadIndex()` for type/tag data. Calls scoring
functions. Applies filters (`--pattern`, `--type`, `--tag`, `--agent`). Omits content loading
unless `--format detailed`.
- _Files_: `skills/memory/src/maintenance/check-relevance.ts`
- _Traceability_: FR-009, FR-014, FR-015

**C-I7** — Implement output formatters: `formatTable(results)` (min 80-column width) and
`formatJson(results)` (valid JSON). `formatDetailed` includes content excerpts.
- _Files_: `skills/memory/src/maintenance/check-relevance.ts`
- _Traceability_: FR-011

**C-I8** — Implement `--auto-move` logic: check for `--confirm`; if absent, print warning and
exit non-zero. If present, call `moveMemory()` for each High-band result (or `--threshold`
override). Honour `--dry-run`.
- _Files_: `skills/memory/src/maintenance/check-relevance.ts`
- _Traceability_: FR-012, FR-013

**C-I9** — Add `cmdCheckRelevance` handler to `utility.ts`. Parse flags and call
`checkRelevance()`.
- _Files_: `skills/memory/src/cli/commands/utility.ts`
- _Traceability_: FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, US-3

**C-I10** — Register `check-relevance` in `index.ts` and add help entry.
- _Files_: `skills/memory/src/cli/index.ts`, `skills/memory/src/cli/help.ts`
- _Traceability_: SC-008

---

## Phase D — LLM Verification (User Story 4)

**Spec traceability**: US-4, FR-016, FR-017, FR-018, FR-019, SC-005

**Goal**: Create the memory-skill-local Ollama service, add `--llm-type` to `suggest-links`, add
`--verify` to `update-edge`, and ensure graceful degradation when Ollama is unavailable.

**Files created**:
- `skills/memory/src/services/ollama.ts` — minimal Ollama client (no hooks import)
- `skills/memory/src/services/ollama.spec.ts` — unit tests with mocked Ollama

**Files modified**:
- `skills/memory/package.json` — add `ollama` dependency
- `skills/memory/src/suggest/suggest-links.ts` — add `--llm-type` flag handling
- `skills/memory/src/graph/link-update.ts` — add `--verify` path (call `services/ollama.ts`)

**Complexity**: Medium. Ollama client is self-contained. Main risk is graceful degradation paths
and timeout handling.

### Phase D Tests (all must be written and seen failing before implementation begins)

**D-T1** — `ollama.spec.ts`: `isAvailable()` returns `false` without throwing when Ollama is not
running (mock the HTTP call).
- _Traceability_: FR-016, SC-005, US-4/AC-2

**D-T2** — `ollama.spec.ts`: `generate()` returns an empty string and does not throw when Ollama
times out (mock a 16-second delay against a 15-second timeout).
- _Traceability_: FR-017, US-4 edge cases

**D-T3** — `ollama.spec.ts`: `generate()` returns the LLM response string when Ollama responds
within timeout.
- _Traceability_: FR-016, US-4/AC-1

**D-T4** — `ollama.spec.ts`: `configureClient()` with a custom host changes the endpoint used
by subsequent `generate()` calls.
- _Traceability_: FR-016

**D-T5** — `ollama.spec.ts`: module does not import anything from `hooks/`; import tree is
self-contained within `skills/memory/`.
- _Traceability_: FR-016

**D-T6** — `suggest-links.spec.ts`: with `--auto-link --llm-type` and Ollama mocked as
available, newly created same-scope edges contain both `label` and `verifiedRelation`.
- _Traceability_: FR-018, US-4/AC-1, US-4/AC-3, US-4/AC-4

**D-T7** — `suggest-links.spec.ts`: with `--auto-link --llm-type` and Ollama mocked as
unavailable, edges are written with `label` only; a warning is printed to stderr; command exits 0.
- _Traceability_: FR-018, US-4/AC-2, SC-005

**D-T8** — `suggest-links.spec.ts`: `--auto-link --llm-type` skips LLM verification for
cross-scope edge candidates (they are not written with `verifiedRelation`).
- _Traceability_: FR-018, US-4 edge cases

**D-T9** — `link-update.spec.ts`: `updateEdgeMetadata({ verify: true })` with Ollama available
stores the LLM result as `verifiedRelation` on the edge.
- _Traceability_: FR-019, US-4/AC-6

**D-T10** — `link-update.spec.ts`: `updateEdgeMetadata({ verify: true })` with Ollama
unavailable prints a warning to stderr and exits without modifying `verifiedRelation`.
- _Traceability_: FR-019, US-4/AC-2, SC-005

### Phase D Implementation (after all D-T tests are written and confirmed failing)

**D-I1** — Add `ollama` to `skills/memory/package.json` dependencies. Run `bun install`.
- _Files_: `skills/memory/package.json`
- _Traceability_: FR-016

**D-I2** — Create `skills/memory/src/services/ollama.ts`. Surface: `generate()`, `isAvailable()`,
`configureClient()`. Reads `chat_model` from `.claude/memory.local.md` YAML front-matter
(minimal reader, consistent with `hooks/src/settings/plugin-settings.ts` approach). Default:
`gemma3:4b`. Timeout: `15_000ms`. No retry logic. Returns `''` on timeout/error; logs to stderr.
No import from `hooks/`.
- _Files_: `skills/memory/src/services/ollama.ts`
- _Traceability_: FR-016, FR-017

**D-I3** — Add `--llm-type` flag handling to `suggest-links.ts`. When `--auto-link` and
`--llm-type` are both set: after computing `label` via inferred-relation logic, call
`services/ollama.generate()` with a structured prompt (source title, target title, inferred
label). Store the trimmed response as `verifiedRelation` on the edge via `addEdge()` metadata.
Skip for cross-scope candidates. Degrade gracefully when `isAvailable()` returns `false`.
- _Files_: `skills/memory/src/suggest/suggest-links.ts`
- _Traceability_: FR-018

**D-I4** — Add `--verify` path to `updateEdgeMetadata()` in `link-update.ts`. Calls
`services/ollama.generate()` with the edge's current `label` as context. Stores the trimmed
result as `verifiedRelation`. Degrades gracefully if Ollama unavailable.
- _Files_: `skills/memory/src/graph/link-update.ts`
- _Traceability_: FR-019

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| `addEdge()` duplicate detection accidentally includes `similarity` | High | Low | A-T3 directly tests this invariant; code review gate |
| `--apply` leaves `verifiedRelation` field on edge (partial cleanup) | High | Low | B-T5 asserts field is absent in final edge; use `delete edge.verifiedRelation` not set-to-undefined |
| `link.ts` grows beyond 600 lines (SC-007) after Phase B | Medium | Low | Extraction to `link-update.ts` happens in B-I2 before adding any new logic |
| `check-relevance` exceeds 5-second budget (SC-004) on 200 memories | Medium | Medium | C-T15 asserts no file reads in type/tag/connectivity paths; C-I6 guards content loading behind `--format detailed` |
| Ollama timeout causes command to hang | Medium | Low | D-T2 tests the 15-second hard timeout; `withTimeout` wrapper required |
| `services/ollama.ts` accidentally imports from `hooks/` | Low | Low | D-T5 directly asserts the import tree; TypeScript project references enforce boundary |
| `verifiedRelation` equals `label` after `--apply` (edge case) | Low | Low | US-2 edge cases: apply succeeds silently; final edge is clean regardless |

---

## Artefacts

| Artefact | Path |
|----------|------|
| Specification | `.specify/specs/feature/004-v1.5.0-memory-graph-enhancements/spec.md` |
| This plan | `.specify/specs/feature/004-v1.5.0-memory-graph-enhancements/plan.md` |
| Data model | `.specify/specs/feature/004-v1.5.0-memory-graph-enhancements/data-model.md` |
| Research | `.specify/specs/feature/004-v1.5.0-memory-graph-enhancements/research.md` |
| Developer quickstart | `.specify/specs/feature/004-v1.5.0-memory-graph-enhancements/quickstart.md` |
| Explore notes | `.specify/specs/explore/v1.5.0-memory-graph-enhancements.md` |
