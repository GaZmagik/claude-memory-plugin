# Developer Quickstart: v1.5.0 Memory Graph Enhancement Suite

**Feature**: 004 — v1.5.0 Memory Graph Enhancement Suite
**Branch**: `feature/004-v1.5.0-memory-graph-enhancements`

---

## Prerequisites

```bash
# Verify Bun is installed
bun --version   # Must be >= 1.0

# Install dependencies for the memory skill package
cd /home/gareth/.vs/claude-memory-plugin/skills/memory
bun install

# Verify the memory CLI is linked globally
memory --version
```

Ollama is **optional** for Phases A, B, and C. Phase D (LLM verification) degrades gracefully
when Ollama is unavailable — tests mock the HTTP layer so no running Ollama instance is required
during development.

---

## Running the Full Test Suite

```bash
# From the memory skill package root
cd /home/gareth/.vs/claude-memory-plugin/skills/memory

# Run all tests
bun test

# Run with verbose output (shows individual test names)
bun test --verbose

# Run with coverage
bun test --coverage
```

---

## Running Tests for a Specific Phase

### Phase A — Similarity on edges

Files under test: `structure.spec.ts`, `edges.spec.ts`, `suggest-links.spec.ts`

```bash
cd /home/gareth/.vs/claude-memory-plugin/skills/memory

bun test src/graph/structure.spec.ts
bun test src/graph/edges.spec.ts
bun test src/suggest/suggest-links.spec.ts

# Or run all three together
bun test src/graph/structure.spec.ts src/graph/edges.spec.ts src/suggest/suggest-links.spec.ts
```

**Key assertions to look for in output**:
- `addEdge stores similarity from EdgeMetadata`
- `addEdge clamps similarity > 1.0 to 1.0`
- `duplicate detection ignores similarity`
- `graph with no similarity field loads cleanly`

---

### Phase B — update-edge + link.ts refactor

Files under test: `link-update.spec.ts`, `structure.spec.ts` (verifiedRelation), `graph.spec.ts`

```bash
cd /home/gareth/.vs/claude-memory-plugin/skills/memory

bun test src/graph/link-update.spec.ts
bun test src/graph/structure.spec.ts
bun test src/cli/commands/graph.spec.ts
```

**Key assertions to look for in output**:
- `updateEdgeMetadata sets similarity on existing edge`
- `updateEdgeMetadata rejects similarity out of range`
- `--apply promotes verifiedRelation to label and removes field`
- `--apply with no verifiedRelation is a no-op`
- `cross-scope edge updated in both graph files`

---

### Phase C — check-relevance

File under test: `check-relevance.spec.ts`

```bash
cd /home/gareth/.vs/claude-memory-plugin/skills/memory

bun test src/maintenance/check-relevance.spec.ts
```

Run each scoring function in isolation to confirm SC-006 (100% coverage of each pure function):

```bash
bun test src/maintenance/check-relevance.spec.ts --verbose 2>&1 | grep -E "score(TypeMatch|TagHeuristics|GraphConnectivity|ContentAnalysis)"
```

**Key assertions to look for in output**:
- `scoreTypeMatch returns 30 for matched type`
- `scoreTagHeuristics returns 0 for mismatched scope tags`
- `scoreGraphConnectivity uses inbound and outbound edges`
- `scoreContentAnalysis does not read files`
- `score 80 classifies as High`
- `score 79 classifies as Medium`
- `--auto-move without --confirm exits non-zero`
- `--dry-run does not modify files`

---

### Phase D — LLM verification

Files under test: `ollama.spec.ts`, updated `suggest-links.spec.ts`, updated `link-update.spec.ts`

```bash
cd /home/gareth/.vs/claude-memory-plugin/skills/memory

bun test src/services/ollama.spec.ts
bun test src/suggest/suggest-links.spec.ts
bun test src/graph/link-update.spec.ts
```

**Key assertions to look for in output**:
- `isAvailable returns false without throwing when Ollama is down`
- `generate returns empty string on timeout`
- `services/ollama does not import from hooks/`
- `--llm-type stores verifiedRelation on same-scope edges`
- `--llm-type skips LLM for cross-scope candidates`
- `--verify stores verifiedRelation via update-edge`

---

## Key Files to Understand Before Implementing Each Phase

### Before Phase A

| File | Why |
|------|-----|
| `skills/memory/src/graph/structure.ts` (217 lines) | `GraphEdge` interface — you will add `similarity?` here |
| `skills/memory/src/graph/edges.ts` (271 lines) | `EdgeMetadata` and `addEdge()` — you will extend and clamp here |
| `skills/memory/src/suggest/suggest-links.ts` (438 lines) | Scoring loop — you will thread `match.similarity` through here |
| `skills/memory/src/graph/link.ts` (503 lines) | `linkMemories()` and `storeCrossScopeEdge()` — `similarity` passes through here |
| `skills/memory/src/search/similarity.ts` | Existing `cosineSimilarity()` — already returns 0–1; understand its return contract |

**Read the data model first**: `.specify/specs/feature/004-v1.5.0-memory-graph-enhancements/data-model.md`
— sections "Extended Entity: GraphEdge" and "Extended Entity: EdgeMetadata".

---

### Before Phase B

| File | Why |
|------|-----|
| `skills/memory/src/graph/link.ts` (503 lines) | Source of truth for `storeCrossScopeEdge()` dual-graph-save pattern — `link-update.ts` must replicate this for cross-scope edges |
| `skills/memory/src/cli/commands/graph.ts` (353 lines) | Where `cmdUpdateEdge` will live — understand the existing `cmdLink` / `cmdUnlink` handler pattern |
| `skills/memory/src/cli/index.ts` | Command dispatch table — you will register `update-edge` here |
| `skills/memory/src/graph/structure.ts` | `GraphEdge` — you will add `verifiedRelation?` here |

**Read the data model first**: sections "New Entity: UpdateEdgeRequest", "New Entity:
UpdateEdgeResponse", and "verifiedRelation Lifecycle".

**Critical**: `--apply` must use `delete edge.verifiedRelation` (not `edge.verifiedRelation =
undefined`) to ensure the field is absent from the serialised JSON, not present as `null` or
`undefined`.

---

### Before Phase C

| File | Why |
|------|-----|
| `skills/memory/src/graph/structure.ts` | `loadMergedGraph()` — understand multi-scope graph loading |
| `skills/memory/src/graph/edges.ts` | `getInboundEdges()`, `getOutboundEdges()` — used by `scoreGraphConnectivity()` |
| `skills/memory/src/maintenance/move.ts` | `moveMemory()` — called by `--auto-move --confirm` |
| `skills/memory/src/maintenance/bulk-delete.ts` | Existing destructive-operation pattern with `--confirm` guard — replicate this for `--auto-move` |
| `skills/memory/src/cli/commands/utility.ts` | Where `cmdCheckRelevance` will live |

**Read the data model first**: section "New Entity: RelevanceScore".

**Performance rule**: The three scoring functions that do not need file content
(`scoreTypeMatch`, `scoreTagHeuristics`, `scoreGraphConnectivity`) must operate on index and
graph data only. File I/O inside those functions will fail C-T15 and violate FR-015.

---

### Before Phase D

| File | Why |
|------|-----|
| `hooks/src/services/ollama.ts` | Reference implementation — do NOT import it; model the new service on it |
| `hooks/src/settings/plugin-settings.ts` | How `.claude/memory.local.md` YAML front-matter is parsed — replicate the same reading approach |
| `skills/memory/package.json` | Where you will add the `ollama` dependency |
| `skills/memory/src/graph/link-update.ts` | Where `--verify` logic goes (Phase B artifact) |
| `skills/memory/src/suggest/suggest-links.ts` | Where `--llm-type` handling goes |

**Read the data model first**: section "New Entity: OllamaService (skills/memory)".

**Gotcha**: The new `services/ollama.ts` must have a 15-second timeout (not the 30-second default
used in `hooks/`). D-T2 tests this boundary. Use a `withTimeout()` wrapper consistent with the
hooks reference implementation.

**Gotcha**: D-T5 asserts the import tree contains no reference to `hooks/`. TypeScript's module
resolver will fail at build time if you accidentally write `import ... from '../../../hooks/...'`,
but add an explicit test so the CI catches it even if the module boundary is relaxed later.

---

## Verifying End-to-End Behaviour (Manual Smoke Tests)

These are for manual verification after automated tests pass. They require a running memory setup.

### Smoke test 1: Similarity on edges (Phase A)

```bash
# Run suggest-links in auto-link mode on a scope with related memories
memory suggest-links --auto-link --scope project

# Inspect the graph — all new edges should have a similarity field
memory graph project | jq '.edges[] | select(.similarity != null) | {source, target, label, similarity}'
```

Expected: each newly created same-scope edge has a `similarity` value between 0 and 1.

---

### Smoke test 2: update-edge (Phase B)

```bash
# Identify two connected memories
memory edges <some-id>

# Set similarity on an existing edge
memory update-edge <sourceId> <targetId> --similarity 0.75

# Verify the field was written
memory graph project | jq '.edges[] | select(.source == "<sourceId>" and .target == "<targetId>")'
```

Expected: `"similarity": 0.75` appears on the edge; no other fields changed.

```bash
# Test --apply: first stage a verifiedRelation manually
memory update-edge <sourceId> <targetId> --relation "staged-label"
# (then manually edit graph.json to set verifiedRelation, or use --verify in Phase D)

# Apply promotion
memory update-edge <sourceId> <targetId> --apply
memory graph project | jq '.edges[] | select(.source == "<sourceId>")'
```

Expected: `label` is updated; `verifiedRelation` field is absent.

---

### Smoke test 3: check-relevance (Phase C)

```bash
# Table output (default)
memory check-relevance project --format table

# JSON output
memory check-relevance project --format json | jq '.[0]'

# Dry-run auto-move
memory check-relevance project --auto-move --dry-run

# Confirm move guard
memory check-relevance project --auto-move        # Should print warning and exit non-zero
memory check-relevance project --auto-move --confirm   # Should move High-band memories
```

---

### Smoke test 4: LLM verification (Phase D, requires Ollama)

```bash
# Check Ollama is running
ollama list

# Run suggest-links with LLM type verification
memory suggest-links --auto-link --llm-type

# Inspect newly created edges for verifiedRelation
memory graph project | jq '.edges[] | select(.verifiedRelation != null)'
```

Expected: same-scope edges created in this run have both `label` and `verifiedRelation`. The
`label` holds the inferred type; `verifiedRelation` holds the LLM's confirmation or correction.

```bash
# Promote a verified relation
memory update-edge <sourceId> <targetId> --apply
memory graph project | jq '.edges[] | select(.source == "<sourceId>") | has("verifiedRelation")'
```

Expected: `false` — no `verifiedRelation` field remains after `--apply`.

---

## TDD Checklist (per task)

Before marking any implementation task complete:

```
TDD: test first? ✅/❌ | seen failing? ✅/❌ | now passing? ✅/❌
```

All three must be `✅` before moving to the next task. This is non-negotiable per constitution
principle P2.
