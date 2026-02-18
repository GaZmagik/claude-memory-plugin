# Research: v1.5.0 Memory Graph Enhancement Suite

**Feature**: 004 — v1.5.0 Memory Graph Enhancement Suite
**Branch**: `feature/004-v1.5.0-memory-graph-enhancements`
**Created**: 2026-02-18

---

## Decision 1: GraphEdge Optional Field Extension Strategy

**Chosen**: Extend `GraphEdge` in `structure.ts` and `EdgeMetadata` in `edges.ts` with two optional
fields: `similarity?: number` and `verifiedRelation?: string`.

**Rationale**: The existing `GraphEdge` type already uses optional fields (`sourceScope`,
`targetScope`, `sourceAgent`, `targetAgent`) for cross-scope metadata. This sparse optional-field
pattern is the established convention in this codebase. Both new fields follow the same convention:
absent on old edges, populated only when relevant. No migration is required; JSON deserialisation
of a graph without the fields simply yields `undefined` for both, which is the correct default.

**Alternatives Considered**:

### Option A: Separate edge-metadata.json file
- **Pros**: Cleaner separation of concerns; `graph.json` stays lean.
- **Cons**: Every edge read requires a second I/O operation. Synchronisation between `graph.json`
  and the metadata store is a new failure mode. Adds complexity for no concrete benefit at current
  scale (~200 memories).
- **Why not chosen**: Rejected per P5 (YAGNI). The existing structure scales adequately.

### Option B: Versioned graph schema migration
- **Pros**: Explicit schema version contract per graph file.
- **Cons**: Migration tooling required; no runtime benefit since both new fields are optional and
  backward-compatible without migration.
- **Why not chosen**: Spec explicitly rules out mandatory migration (see Assumptions). Opt-in
  backfill via `update-edge` is preferred.

---

## Decision 2: Duplicate Edge Detection Must Ignore New Fields

**Chosen**: The `addEdge()` duplicate check in `edges.ts` remains based on `(source, target, label)`
only. `similarity` and `verifiedRelation` are NOT considered in duplicate detection.

**Rationale**: Identity of an edge is defined by what it connects and the semantic relationship,
not by metadata that may be enriched later. If duplicate detection included `similarity`, two calls
to link the same memories with different computed similarity values (e.g., after re-running
suggest-links) would create duplicate edges. This would break the existing idempotency guarantee.

**FR reference**: FR-004.

---

## Decision 3: Similarity Clamping Location

**Chosen**: Clamp `similarity` to `[0, 1]` at the write boundary — inside `updateEdgeMetadata`
(in `link-update.ts`) and at the point of threading through `suggest-links`. `NaN` and `Infinity`
are rejected with a validation error, not silently clamped.

**Rationale**: `cosineSimilarity()` in `similarity.ts` is documented as returning values in `[0,
1]` for normal input, but floating-point arithmetic can produce values fractionally outside this
range (e.g., `1.0000000000000002`). Clamping at the write boundary is a defensive measure
consistent with the principle of not trusting callers. `NaN` and `Infinity` are distinct from
floating-point rounding error and indicate an upstream bug, so they are rejected rather than
silently coerced.

**FR reference**: FR-002.

---

## Decision 4: verifiedRelation Lifecycle — Stage then Promote

**Chosen**: Two-phase staging → promotion pattern:
1. LLM verification (`--llm-type` or `--verify`) writes `verifiedRelation` onto the edge as a
   staging field alongside the original `label`.
2. `update-edge --apply` promotes `verifiedRelation` to `label` and removes `verifiedRelation`
   entirely. No dangling staging fields survive promotion.

**Rationale**: Replacing `label` immediately on LLM verification would destroy the original
inferred label, making audit and revert impossible without re-running the pipeline. The staging
field allows the user to review the LLM's suggestion before committing. The clean-on-apply rule
means that after promotion, the edge state is `{ label, similarity? }` — no staging residue.

**Alternatives Considered**:

### Option A: Replace `label` immediately on LLM verification
- **Pros**: Simpler state machine — no staging field to manage.
- **Cons**: Destroys the original inferred label. Irreversible without pipeline re-run.
- **Why not chosen**: Loss of audit trail; rejected by explore phase.

### Option B: Store `llmConfidence` alongside `verifiedRelation`
- **Pros**: Provides a numeric confidence signal for filtering or display.
- **Cons**: `llmConfidence` must also be explicitly removed on `--apply`, adding a field that must
  be cleaned up. The presence of `verifiedRelation` itself is sufficient signal that LLM
  verification has run.
- **Why not chosen**: Spec explicitly rules this out (see Assumptions). Rejected per P5 (YAGNI).

---

## Decision 5: link-update.ts Extraction from link.ts

**Chosen**: Extract `updateEdgeMetadata` and supporting helpers to a new file
`skills/memory/src/graph/link-update.ts`. The `cmdUpdateEdge` CLI handler lives in
`skills/memory/src/cli/commands/graph.ts`.

**Rationale**: `link.ts` is at 503 lines with a warning threshold of 500 and a hard limit of 1000.
Adding the `update-edge` logic directly would push it well past the warning threshold. The
extraction is both a codebase hygiene measure and the right place for the new logic — `link.ts`
owns creation and removal; `link-update.ts` owns mutation of existing edges. The CLI handler
follows the established pattern of living in `graph.ts` alongside other graph-related CLI
commands (`cmdLink`, `cmdUnlink`, `cmdEdges`, etc.). `graph.ts` is at 353 lines, well within
limits.

**FR reference**: FR-008.

---

## Decision 6: Ollama Service in skills/memory — Independent Module

**Chosen**: Create `skills/memory/src/services/ollama.ts` as a self-contained Ollama client
that does NOT import from `hooks/`. It reads `chat_model` from `.claude/memory.local.md` using a
minimal YAML front-matter reader. Default model: `gemma3:4b`. Timeout: `15_000ms` (15 seconds).

**Rationale**: `hooks/` and `skills/memory/` are different runtime packages with independent
`package.json` files. Importing from `hooks/` in `skills/memory/` would create a cross-package
dependency not reflected in `package.json`, violating module boundaries. The new service is
modelled closely on `hooks/src/services/ollama.ts` but adapted for CLI context: 15-second timeout
(vs 30-second for hooks), no retry logic (CLI commands are user-interactive, not background
processes), and no `embed()` function (only `generate()` and `isAvailable()` are needed).

The front-matter reader for `.claude/memory.local.md` must be consistent with the pattern in
`hooks/src/settings/plugin-settings.ts` to avoid reading a stale value.

**Alternatives Considered**:

### Option A: Shared Ollama package extracted from hooks
- **Pros**: Eliminates duplication between hooks and skills.
- **Cons**: Requires monorepo-level refactor; adds a build dependency; over-engineering for two
  consumers that have legitimately different timeout and retry requirements.
- **Why not chosen**: Rejected per P5 (YAGNI). Revisit at v2.x if more packages need Ollama.

### Option B: Call hooks Ollama service via subprocess
- **Pros**: Single Ollama client implementation.
- **Cons**: Subprocess overhead; tight coupling between independently deployable packages.
- **Why not chosen**: Brittle and complex.

**FR reference**: FR-016, FR-017.

---

## Decision 7: check-relevance Scoring — Index-Only for Non-Detailed Formats

**Chosen**: Three of the four scoring components (type match, tag heuristics, graph connectivity)
operate on index data and loaded graph only, without reading memory file content. The fourth
component (content analysis) loads file content only when `--format detailed` is specified.

**Rationale**: FR-015 requires `check-relevance` on 200 memories to complete in under 5 seconds
without Ollama. Loading 200 full memory files is the primary performance risk. Graph and index
data are already in memory after `loadMergedGraph()` and `loadIndex()`. Content analysis using
simple keyword and length heuristics (no NLP library) provides the 20-point content component
with acceptable accuracy for a scope hygiene tool.

**Scoring implementation**: Four pure, independently testable functions, each accepting a typed
input record and returning a `number` in its declared range. This satisfies SC-006 (100% coverage
of each scoring function in isolation).

**FR reference**: FR-009, FR-015. **SC reference**: SC-006.

---

## Decision 8: suggest-links Threading — SuggestLinksRequest/Response

**Chosen**: Add `similarity?: number` to the match record threaded from `findSimilarMemories()`
through to `linkMemories()` and `storeCrossScopeEdge()`. Cross-scope edges remain read-only in
`auto-link`; similarity is stored on same-scope edges only during auto-link. Cross-scope
similarity can be set via `update-edge`.

**Rationale**: The `findSimilarMemories()` function in `similarity.ts` already returns `{ id,
similarity }` per match. The similarity value is computed but currently discarded when `autoLink`
is true. Threading it through to the `addEdge` call requires adding `similarity?: number` to
`EdgeMetadata` in `edges.ts` and passing it through the chain. This is the smallest change that
satisfies FR-003.

**FR reference**: FR-003.

---

## Technology Confirmation

**Bun test runner**: Already in use. New tests use `mock.module()` pattern (not `vi.mock()`).
The existing `suggest-links.spec.ts` uses `vitest` imports (`vi.spyOn`) — the project appears to
use Vitest, not Bun's native test runner. New tests must match the existing pattern.

**ollama-js**: Add to `skills/memory/package.json` as a direct dependency. The package is already
in `hooks/package.json`. No version conflict risk.

**cosineSimilarity() / findSimilarMemories()**: Already in `search/similarity.ts`. No new
similarity library required.

**moveMemory()**: Already in `maintenance/move.ts`. Used by `check-relevance --auto-move`.

**loadMergedGraph()**: Already in `graph/structure.ts`. Used by `check-relevance` for multi-scope
loading.

---

## Open Questions

None. All open questions from the spec were resolved during exploration and specification phases.
