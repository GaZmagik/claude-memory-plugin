# Feature Specification: v1.5.0 Memory Graph Enhancement Suite

**Feature ID**: 004
**Feature Branch**: `feature/004-v1.5.0-memory-graph-enhancements`
**Created**: 2026-02-18
**Status**: Draft
**Input**: v1.5.0 Memory Graph Enhancement Suite — four interrelated graph enhancement features

---

## Overview

This feature delivers four enhancements to the claude-memory-plugin memory graph, grouped into two tracks:

**Data enrichment track** (Features 2, 3, 4): Edges in the memory graph currently carry only a relation label. This track adds cosine similarity scores and LLM-verified relation types as optional edge metadata, and provides a command to inspect, correct, and promote that metadata on existing edges.

**Analysis tooling track** (Feature 1): A new `check-relevance` command that scores each memory against its current scope using four independent heuristics, then surfaces candidates for scope migration. This was deferred from v1.4.0 and is independent of the data enrichment track.

Together the four features make the graph richer (similarity-weighted edges, verified relation labels), more trustworthy (LLM confirmation of inferred relations), and easier to maintain (relevance scoring and targeted edge updates).

All features build on the v1.4.0 agent-scoped memories foundation. No breaking changes are introduced; all new edge fields are optional, and existing graphs load cleanly without migration.

---

## User Scenarios & Testing

### User Story 1 — Similarity values on edges (Priority: P1)

As a developer using the memory graph, I want edges created by `suggest-links --auto-link` to carry the cosine similarity score that triggered the link, so that I can distinguish high-confidence links from marginal ones when reviewing or pruning the graph.

**Why this priority**: This is the smallest change and has no dependencies. It is pure data enrichment that unblocks the remaining three features. Without it, similarity scores are computed and discarded, making the graph less informative.

**Independent test**: Can be fully tested by running `suggest-links --auto-link`, then inspecting the resulting `graph.json` to confirm that new edges contain a `similarity` field in the range 0–1.

**Acceptance Scenarios**:

1. **Given** a memory graph with two semantically related memories, **When** `suggest-links --auto-link` creates an edge between them, **Then** the edge in `graph.json` contains a `similarity` field holding a float between 0 and 1 (inclusive).
2. **Given** an edge already exists between two nodes, **When** `suggest-links --auto-link` encounters them again (duplicate detection), **Then** the existing edge is not modified and no duplicate edge is created; the `similarity` value does not affect duplicate detection.
3. **Given** a similarity value is computed as outside the 0–1 range due to floating-point error, **When** the edge is written, **Then** the value is clamped to the nearest bound (0 or 1) before storage.
4. **Given** an existing `graph.json` on disk that has no `similarity` field on its edges, **When** the graph is loaded, **Then** it loads without error and existing edges behave identically to before.

---

### User Story 2 — Edge update command (Priority: P2)

As a developer maintaining the memory graph, I want a `memory update-edge <sourceId> <targetId>` command that lets me backfill or correct `similarity`, `relation`, and `verifiedRelation` fields on any edge — including edges created before these features existed — so that I can enrich historical data without re-running the full suggest-links pipeline.

**Why this priority**: This command provides the backfill path that makes Feature 1 (similarity) useful on existing graphs, and sets up the `--apply` promotion path required by Feature 3 (LLM verification). It also triggers the necessary extraction of logic from `link.ts` (currently at the file-size warning threshold), keeping the codebase within maintainability limits.

**Independent test**: Can be fully tested by creating an edge with no `similarity` field, running `update-edge --similarity 0.75`, and confirming the field appears on the edge in `graph.json` without any other edge fields changing.

**Acceptance Scenarios**:

1. **Given** an edge exists between two memories in the same scope, **When** `update-edge <sourceId> <targetId> --similarity 0.75` is run, **Then** the edge in `graph.json` has `similarity: 0.75` and all other edge fields are unchanged.
2. **Given** an edge exists between two memories in the same scope, **When** `update-edge <sourceId> <targetId> --relation "superseded-by"` is run, **Then** the edge `label` is updated to `"superseded-by"`.
3. **Given** an edge has a `verifiedRelation` field set, **When** `update-edge <sourceId> <targetId> --apply` is run, **Then** the edge `label` is replaced with the value of `verifiedRelation`, the `verifiedRelation` field is removed entirely, and the final edge contains no `verifiedRelation` field.
4. **Given** an edge has no `verifiedRelation` field, **When** `update-edge <sourceId> <targetId> --apply` is run, **Then** the command exits successfully with a message indicating no staged relation was present (idempotent no-op).
5. **Given** an edge is a cross-scope edge (stored in two `graph.json` files), **When** `update-edge` is run against it, **Then** both graph files are updated consistently.
6. **Given** `--similarity 1.5` is supplied (out of range), **When** `update-edge` is run, **Then** the command rejects the value with a clear validation error before writing anything.

---

### User Story 3 — Memory scope relevance checking (Priority: P3)

As a developer managing a growing memory graph, I want a `memory check-relevance [scope]` command that scores each memory against its current scope using multiple heuristics and surfaces candidates for migration to a more appropriate scope, so that I can keep scopes well-organised as the graph evolves.

**Why this priority**: This is independent of the data enrichment track and has the largest surface area of the four features. It delivers standalone value — scope hygiene — without requiring Features 1, 2, or 4. Placed at P3 because it has no upstream blockers once P1 and P2 stabilise the codebase.

**Independent test**: Can be fully tested by running `check-relevance` against a scope that contains a memory clearly mismatched to its scope (e.g., a project-scoped memory with only global tags and no project-specific graph connections), then confirming the memory appears in the output with a Low or None confidence band.

**Acceptance Scenarios**:

1. **Given** a memory whose type, tags, graph connectivity, and content all strongly match its current scope, **When** `check-relevance` is run, **Then** the memory receives a score of ≥80 (High band) and does not appear as a migration candidate.
2. **Given** a memory whose heuristics collectively score below 40, **When** `check-relevance` is run, **Then** the memory is reported in the None confidence band. `suggestedScope` is absent (not populated) for None-band memories — a score below 40 indicates no confident scope opinion, so no migration suggestion is made.
3. **Given** `check-relevance --format table` is run, **Then** output is a human-readable table listing memory ID, current scope, suggested scope, score, and confidence band.
4. **Given** `check-relevance --format json` is run, **Then** output is valid JSON containing the same fields, suitable for piping to other commands.
5. **Given** `check-relevance --dry-run --auto-move` is run, **Then** no memories are moved; the command prints what would have moved without modifying any files.
6. **Given** `check-relevance --auto-move` is run without `--dry-run` and without `--confirm`, **Then** the command prints a warning to stderr, exits with a non-zero status code, and performs no moves.
7. **Given** `check-relevance --auto-move --confirm` is run, **Then** memories with High confidence (≥80) are moved to their suggested scope; memories below 80 are listed but not moved.
8. **Given** `check-relevance --threshold 60` is run with `--auto-move --confirm`, **Then** only memories scoring ≥60 are moved (overriding the default 80 threshold for auto-move).
9. **Given** `check-relevance --type learning` is run, **Then** only memories of type `learning` are scored and reported.
10. **Given** `check-relevance --agent <name>` is run, **Then** only memories in the named agent's namespace are scored.

---

### User Story 4 — LLM-based link type verification (Priority: P4)

As a developer using `suggest-links --auto-link`, I want an optional `--llm-type` flag that asks a local LLM to verify the inferred relation label before the edge is written, and stores the LLM's suggestion as a separate `verifiedRelation` field on the edge, so that I can later review and promote the verified label using `update-edge --apply`.

**Why this priority**: This is the most experimental feature and depends on the Ollama service abstraction established in Feature 2's backfill path and the `verifiedRelation` field lifecycle introduced by Feature 2 (P2). It is lowest priority because it can be omitted without affecting the other three features.

**Independent test**: Can be fully tested by running `suggest-links --auto-link --llm-type` against two memories, then inspecting the resulting edge in `graph.json` to confirm a `verifiedRelation` field is present (or absent when Ollama is unavailable, with a clear log message).

**Acceptance Scenarios**:

1. **Given** `suggest-links --auto-link --llm-type` is run and Ollama is available, **When** a new edge is written, **Then** the edge contains both `label` (the inferred type) and `verifiedRelation` (the LLM's confirmed or corrected label).
2. **Given** `suggest-links --auto-link --llm-type` is run and Ollama is unavailable, **When** a new edge would be written, **Then** the edge is written with `label` only (no `verifiedRelation`), and a clear warning is printed to stderr; the command does not fail.
3. **Given** `suggest-links --auto-link --llm-type` is run and the LLM confirms the inferred label, **When** the edge is written, **Then** `verifiedRelation` holds the same value as `label`.
4. **Given** `suggest-links --auto-link --llm-type` is run and the LLM suggests a different label, **When** the edge is written, **Then** `label` holds the original inferred value and `verifiedRelation` holds the LLM's suggestion, leaving both accessible for audit.

**LLM prompt structure**: The prompt sent to Ollama MUST include the source memory title, the target memory title, and the inferred relation label. The response is trimmed and taken as-is as the `verifiedRelation` value. If the LLM response exactly matches the inferred label (case-insensitive, trimmed), the result is considered a "confirmation" (AC-3); otherwise it is a "suggestion" (AC-4). The prompt format is an implementation detail documented in `link-update.ts` and `suggest-links.ts`; the key contract here is the input/output boundary: inferred label in → confirmed-or-corrected label out.
5. **Given** an edge with `verifiedRelation` set has `update-edge --apply` run against it, **Then** `label` becomes the `verifiedRelation` value and `verifiedRelation` is removed entirely (clean promotion, per User Story 2, Scenario 3).
6. **Given** `update-edge <sourceId> <targetId> --verify` is run against an existing edge, **Then** Ollama is invoked, and the result is stored as `verifiedRelation` on the edge (same behaviour as `--llm-type` in suggest-links, available independently for backfilling).

---

### Edge Cases

- What happens when `check-relevance` is run against a scope with zero memories? The command exits cleanly with a message indicating no memories to assess.
- What happens when `update-edge` targets a source or target ID that does not exist in any graph? The command exits with a clear error identifying which ID was not found.
- What happens when `update-edge --apply` is run on an edge where `verifiedRelation` equals the existing `label`? The apply succeeds silently; the edge is left clean with no `verifiedRelation` field.
- What happens when `suggest-links --auto-link --llm-type` encounters a cross-scope edge candidate? The LLM verification is skipped for cross-scope edges (consistent with the existing constraint that `--auto-link` is read-only for cross-scope edges); similarity is also not stored on cross-scope edges during auto-link.
- What happens when the Ollama call times out during `--llm-type` or `--verify`? The operation degrades gracefully: the edge is written without `verifiedRelation`, and a timeout warning is printed to stderr.
- What happens when `check-relevance --auto-move --confirm` is run and a target scope does not yet have a `graph.json`? The move operation creates the necessary structure, consistent with how `memory move` behaves.
- What happens when `similarity` is stored as `NaN` or `Infinity` due to an upstream bug? Clamping to 0–1 handles `Infinity`, but `NaN` must be rejected with an error at the write boundary.

---

## Requirements

### Functional Requirements

#### FR-001 — Similarity field on GraphEdge

The `GraphEdge` data structure MUST include an optional `similarity` field of type float (0–1). The field MUST be optional so that edges created before v1.5.0 remain valid without migration.

**Acceptance Criteria**: A `graph.json` containing an edge without a `similarity` field loads without error. A `graph.json` containing an edge with `similarity: 0.87` loads and the value is accessible.

#### FR-002 — Similarity clamping at write time

When any code path writes a `similarity` value to an edge, the system MUST validate the value before storage. Values of `NaN` or `Infinity` MUST be rejected with a validation error before writing. Two distinct clamping behaviours apply depending on the call site:

- **User-supplied values** (via `update-edge --similarity`): out-of-range values (< 0 or > 1) MUST be rejected with a clear validation error; silent clamping MUST NOT occur.
- **Internally computed values** (via `suggest-links --auto-link`): values fractionally outside [0, 1] due to floating-point rounding are silently clamped to the nearest bound (0 or 1) before storage.

**Acceptance Criteria**: Calling `update-edge --similarity 1.3` is rejected with a validation error before writing anything. Internally computed similarity of `1.0000000001` is silently stored as `1.0`.

#### FR-003 — Similarity threading through suggest-links

When `suggest-links --auto-link` creates an edge, it MUST store the cosine similarity score that triggered the match on the resulting edge as `similarity`. The score MUST be threaded from the scoring loop through to the `linkMemories()` call (see FR-002 for clamping behaviour at the write boundary).

**Acceptance Criteria**: After running `suggest-links --auto-link`, all newly created same-scope edges in `graph.json` have a `similarity` field. Cross-scope edges do not receive a `similarity` field during auto-link (existing constraint).

#### FR-004 — Duplicate detection ignores similarity

Duplicate detection in edge creation MUST be based on source node, target node, and relation label only. The `similarity` field and `verifiedRelation` field MUST NOT be considered when determining whether an edge already exists.

**Acceptance Criteria**: Two calls to create an edge with the same source, target, and label but different `similarity` values do not create a duplicate edge.

#### FR-005 — verifiedRelation field on GraphEdge

The `GraphEdge` data structure MUST include an optional `verifiedRelation` field of type string. Its presence indicates that an LLM verification has been run but the result has not yet been promoted to `label`.

**Acceptance Criteria**: An edge can have both `label: "related-to"` and `verifiedRelation: "superseded-by"` simultaneously. After `--apply`, only `label: "superseded-by"` remains.

#### FR-006 — update-edge command

The system MUST provide a `memory update-edge <sourceId> <targetId>` CLI command supporting the following flags:

- `--similarity <float>`: Set or replace the `similarity` field on the edge.
- `--relation <label>`: Set or replace the `label` field on the edge.
- `--verify`: Invoke LLM verification on the current relation label, storing the result as `verifiedRelation`. (Acceptance criteria for `--verify` are defined in US-4/AC-6 and FR-019.)
- `--apply`: Promote `verifiedRelation` to `label` and remove `verifiedRelation` entirely.

**Acceptance Criteria**: Each flag operates independently. `--apply` on an edge with no `verifiedRelation` is an idempotent no-op with a clear message. `--verify` and `--apply` are mutually exclusive in a single call; supplying both MUST be rejected with a validation error.

#### FR-007 — update-edge cross-scope support

`update-edge` MUST locate and update edges stored across multiple `graph.json` files (cross-scope edges are stored in both the source and target scope graphs). The `updateEdgeMetadata()` function accepts an optional `crossScopeBasePaths: string[]` parameter listing additional scope base paths to scan beyond the primary scope — see `data-model.md` `UpdateEdgeRequest` for the full parameter definition.

**Acceptance Criteria**: Running `update-edge` on a cross-scope edge updates the edge in both scope graphs consistently.

#### FR-008 — link.ts extraction

The implementation of `update-edge` logic MUST reside in a new file (`link-update.ts`) extracted from the existing `link.ts`. This extraction MUST precede any additions to `link.ts` to keep it within the established file-size limit.

**Acceptance Criteria**: `link.ts` remains below the hard limit. `link-update.ts` contains the update-edge logic and is independently importable.

#### FR-009 — check-relevance scoring

The `check-relevance` command MUST score each memory against its current scope using four independently computed components totalling 100 points:

| Component | Points | Basis |
|-----------|--------|-------|
| Memory type match | 30 | Whether the memory type is appropriate for the scope |
| Tag-based heuristics | 25 | Whether tags suggest a different scope |
| Graph connectivity | 25 | Whether the memory's edges connect primarily within or outside its scope |
| Content analysis | 20 | Whether content signals match scope conventions |

**Scoring rubric** — minimum, half, and full score conditions for each component:

| Component | 0 (no match) | Half score | Full score |
|-----------|-------------|------------|------------|
| Type match (0–30) | Type is never associated with this scope (e.g. `gotcha` in `global`) | Type is occasionally associated but not canonical for this scope | Type is strongly associated with this scope (e.g. `decision` in `project`) |
| Tag heuristics (0–25) | All tags are exclusively associated with a different scope | Tags are mixed; no clear scope signal | All tags are strongly associated with the current scope |
| Graph connectivity (0–25) | All edges connect to memories in different scopes | Roughly equal split of same-scope and cross-scope edges | All edges connect to memories in the same scope |
| Content analysis (0–20) | No keyword or length signals matching scope conventions | One or two weak keyword matches | Multiple strong keyword matches and length consistent with scope conventions |

**Acceptance Criteria**: Each scoring function is independently testable and returns a value in its declared range. The total score is the sum of all four components (0–100).

#### FR-010 — check-relevance confidence bands

The `check-relevance` command MUST classify scores into confidence bands:

| Band | Score range | Implication |
|------|-------------|-------------|
| High | ≥80 | Auto-move safe with `--auto-move --confirm` |
| Medium | 60–79 | Suggested with `--dry-run` |
| Low | 40–59 | Flagged for manual review |
| None | <40 | No strong opinion; reported but not actioned |

**Acceptance Criteria**: A memory scoring 80 is classified as High. A memory scoring 79 is classified as Medium.

#### FR-011 — check-relevance output formats

`check-relevance` MUST support `--format table` (default, human-readable) and `--format json` (machine-readable). The `--format detailed` option MUST include content excerpts alongside the scores.

**Table format column layout** (`--format table`): columns in order are `ID`, `Scope`, `Suggested`, `Score`, `Band`, `Rationale`. The `ID` column is truncated to 30 characters; `Rationale` occupies the remaining width. The total output MUST fit within 80 columns on a standard terminal; any field that would exceed its allocated width is truncated with `...`.

**Detailed format content excerpts** (`--format detailed`): for each memory, the output MUST include the first 200 characters of the memory file's content body, truncated with `...` if longer. The excerpt is displayed beneath the score row.

**Acceptance Criteria**: `--format json` output is valid JSON. `--format table` output fits within 80 columns. `--format detailed` includes a content excerpt (≤200 characters + `...`) for every memory in the results.

#### FR-012 — check-relevance --auto-move requires --confirm

The `--auto-move` flag MUST require explicit `--confirm` to prevent accidental bulk scope changes. Running `--auto-move` without `--confirm` MUST print a warning and exit without moving anything.

**Acceptance Criteria**: `check-relevance --auto-move` without `--confirm` exits with a non-zero status and a clear message. `check-relevance --auto-move --confirm` performs the moves.

#### FR-013 — check-relevance --dry-run

When `--dry-run` is specified, `check-relevance` MUST report what would be moved without modifying any files or graph structures.

**Acceptance Criteria**: No `graph.json` or memory file is modified when `--dry-run` is active.

#### FR-014 — check-relevance filtering flags

`check-relevance` MUST support the following filters that restrict which memories are scored:

- `--pattern <glob>`: Filter by memory ID pattern. The glob is matched against the memory ID (e.g. `--pattern "learning-*"` includes only memories whose ID begins with `learning-`).
- `--type <type>`: Filter by memory type.
- `--tag <tag>`: Filter by tag.
- `--agent <name>`: Filter to a named agent's namespace only.
- `--threshold <score>`: Context-dependent override with two distinct defaults:
  - **Reporting context** (without `--auto-move`): overrides the minimum score for inclusion in output (default: 40). Memories scoring below this value are not reported.
  - **Auto-move context** (with `--auto-move --confirm`): overrides the minimum score for triggering a move (default: 80). Memories scoring at or above this value are moved.
  - In both contexts the same `--threshold` flag is used; the default differs by context and is documented in the help output.

**Acceptance Criteria**: Each filter flag independently restricts the set of memories assessed. Combined flags apply as AND conditions. `--agent <name>` restricts scoring to the named agent's namespace only. `--pattern "learning-*"` restricts scoring to memories whose ID matches the glob.

#### FR-015 — check-relevance performance

The scoring components for type, tag, and graph connectivity MUST operate on index data only and MUST NOT load full memory file content unless `--format detailed` is specified.

**Acceptance Criteria**: Running `check-relevance` on a scope with 200 memories and `--format table` completes in under 5 seconds without Ollama.

#### FR-016 — Ollama service for memory skill

The memory skill MUST provide its own Ollama service module (`services/ollama.ts`) with `generate()` and `isAvailable()` functions. This module MUST NOT import from the hooks package. It MUST read `chat_model` from `.claude/memory.local.md`, defaulting to `gemma3:4b`.

**Acceptance Criteria**: `services/ollama.ts` can be imported in isolation without triggering any hooks-package imports. `isAvailable()` returns `false` without throwing when Ollama is not running. Edge-case configuration behaviour:

- Given `.claude/memory.local.md` does not exist: the service uses the default model `gemma3:4b` without error.
- Given `.claude/memory.local.md` exists but has no YAML frontmatter: the service uses the default model `gemma3:4b` without error.
- Given `.claude/memory.local.md` has a YAML frontmatter block but `chat_model` is absent or empty: the service uses the default model `gemma3:4b` without error.
- Given `.claude/memory.local.md` has malformed YAML: the service logs a warning to stderr, uses the default model, and does not throw.

#### FR-017 — LLM verification timeout

LLM calls made from the memory skill CLI MUST use a 15-second timeout per call. Exceeding this timeout MUST result in graceful degradation (edge written without `verifiedRelation`) and a warning to stderr.

**Acceptance Criteria**: When Ollama responds after 15 seconds, the edge is written without `verifiedRelation` and the command exits with status 0.

#### FR-018 — suggest-links --llm-type flag

The `suggest-links` command MUST support a `--llm-type` flag. When set alongside `--auto-link`, the system MUST invoke LLM verification on the inferred relation label before writing each same-scope edge, storing the result as `verifiedRelation`.

**Acceptance Criteria**: `suggest-links --auto-link --llm-type` without Ollama writes edges with `label` only and prints a warning. With Ollama, edges also contain `verifiedRelation`.

#### FR-019 — update-edge --verify flag

`update-edge` MUST support a `--verify` flag that invokes LLM verification on the edge's current `label`, storing the LLM's response as `verifiedRelation`. This enables backfilling LLM verification on edges created before `--llm-type` was available.

**Acceptance Criteria**: `update-edge <src> <tgt> --verify` with Ollama available stores `verifiedRelation` on the edge. Without Ollama, it prints a warning and exits without modifying `verifiedRelation`.

### Key Entities

- **GraphEdge**: The edge structure connecting two memory nodes. Extended in v1.5.0 with two optional fields: `similarity?: number` (cosine similarity score, 0–1) and `verifiedRelation?: string` (LLM-suggested relation label, staging area before promotion). Identity is defined by `(source, target, label)` — the new fields are metadata, not identity keys.

- **RelevanceScore**: The output of `check-relevance` for a single memory. Contains the memory ID, current scope, suggested scope, total score (0–100), individual component scores, confidence band (High/Medium/Low/None), and a human-readable rationale.

- **OllamaService**: The service abstraction in `services/ollama.ts`. Provides `generate(prompt: string): Promise<string>` and `isAvailable(): Promise<boolean>`. Reads model configuration from `.claude/memory.local.md`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: All four commands (`suggest-links --auto-link`, `update-edge`, `check-relevance`, `suggest-links --auto-link --llm-type`) complete without error on a graph of 100 project-scoped memories with at least 20 edges and no agent-scoped memories.
- **SC-002**: Edges created by `suggest-links --auto-link` after v1.5.0 all contain a `similarity` field; existing edges without the field continue to load and function correctly.
- **SC-003**: `update-edge --apply` leaves no `verifiedRelation` field on the edge; the final edge state is clean. (`llmConfidence` is never stored — see Assumptions.)
- **SC-004**: `check-relevance` completes in under 5 seconds for a 200-memory scope when `--format detailed` is not used.
- **SC-005**: When Ollama is unavailable, all three LLM-dependent operations (`--llm-type`, `update-edge --verify`, `quality --deep`) degrade gracefully with a warning message and exit status 0.
- **SC-006**: The test suite has 100% coverage of all four scoring functions in `check-relevance.ts`, each tested in isolation.
- **SC-007**: `link.ts` remains below 600 lines after the extraction to `link-update.ts`.
- **SC-008**: All new CLI commands and flags are documented in the memory skill `help` output and README.

---

## Assumptions

- `link.ts` is currently at 503 lines. The project enforces a 500-line soft warning threshold and a 600-line hard limit. The extraction of update-edge logic to `link-update.ts` will bring `link.ts` below the 500-line warning threshold. SC-007 tracks the hard limit (600 lines); the goal is to return below the soft warning threshold (500 lines) as well.
- The existing `cosineSimilarity()` function in `skills/memory/src/search/similarity.ts` returns values in the range [0, 1] for normal input, but floating-point rounding may produce values fractionally outside this range.
- `ollama-js` is already a dependency in `hooks/package.json`; adding it to `skills/memory/package.json` is a straightforward addition with no version conflict risk.
- Cross-scope edges created by `suggest-links --auto-link` are read-only under the existing production constraint. This constraint is preserved in v1.5.0; cross-scope similarity and `verifiedRelation` can only be set via `update-edge`.
- The `--confirm` requirement for `check-relevance --auto-move` follows the same pattern used by other destructive bulk operations in the memory skill (e.g., `bulk-delete`).
- `llmConfidence` will NOT be stored on edges. The presence of `verifiedRelation` is sufficient signal that LLM verification has run. This keeps the staging state simple and avoids a dangling field that must be cleaned up on `--apply`.
- Similarity clamping is performed defensively at the write boundary (in `updateEdgeMetadata` and in the suggest-links threading path), not trusted from callers.
- The content analysis scoring component in `check-relevance` uses simple keyword and length heuristics, not embeddings or NLP libraries, consistent with P5 (YAGNI).

---

## Out of Scope

- Migrating existing `graph.json` files to add `similarity` fields to pre-existing edges. Backfill is opt-in via `update-edge`.
- A shared Ollama package extracted from `hooks` into a common monorepo module. The `skills/memory/src/services/ollama.ts` module is self-contained for this version.
- Storing `llmConfidence` (a numeric confidence value) alongside `verifiedRelation` on edges. The decision is to omit this field entirely.
- LLM verification for cross-scope edges during `suggest-links --auto-link`. Cross-scope LLM verification is available via `update-edge --verify`.
- UI or non-CLI interfaces for any of these features.
- Integration with Ollama models other than the `chat_model` configured in `.claude/memory.local.md` (defaulting to `gemma3:4b`).
- Automatic `--apply` promotion without a user-initiated `update-edge --apply` command.
- `check-relevance` suggestions based on semantic similarity between memory content and scope descriptions. Scoring is based on type, tags, connectivity, and simple content heuristics only.

---

## Dependencies

- v1.4.0 agent-scoped memories (released) — provides `loadMergedGraph()`, `getInboundEdges()`, `getOutboundEdges()`, `moveMemory()`, and agent-scope filtering used by Features 1 and 3.
- `ollama-js` package — must be added to `skills/memory/package.json` for Feature 3.
- `skills/memory/src/search/similarity.ts` — existing `cosineSimilarity()` function used by Feature 1.
- `skills/memory/src/graph/edges.ts` — `EdgeMetadata` type extended by Feature 1.
- `skills/memory/src/graph/structure.ts` — `GraphEdge` type extended by Feature 1.
- `skills/memory/src/graph/link.ts` — source file for the Feature 4 extraction.

---

## Open Questions

_All open questions from the explore phase have been resolved in this specification:_

1. **Should `check-relevance --auto-move` require `--confirm`?** Resolved: Yes. `--auto-move` without `--confirm` exits with a warning and non-zero status (FR-012). This follows the existing destructive-operation pattern in the memory skill.

2. **Should `similarity` be clamped defensively or trusted from callers?** Resolved: Clamp defensively at the write boundary in `updateEdgeMetadata` and in the suggest-links threading path (FR-002). `NaN` and `Infinity` are rejected with a validation error.

3. **Should `llmConfidence` be stored on the edge before `--apply`?** Resolved: No. The presence of `verifiedRelation` is sufficient signal. Omitting `llmConfidence` keeps the staging state simple and avoids a field that must be explicitly removed on `--apply` (FR-005, Assumptions).
