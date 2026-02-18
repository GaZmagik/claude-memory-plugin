# Data Model: v1.5.0 Memory Graph Enhancement Suite

**Feature**: 004 — v1.5.0 Memory Graph Enhancement Suite
**Branch**: `feature/004-v1.5.0-memory-graph-enhancements`
**Created**: 2026-02-18

---

## Extended Entity: GraphEdge

**File**: `skills/memory/src/graph/structure.ts`

**Description**: The existing edge structure connecting two memory nodes in the graph. v1.5.0
extends it with two optional metadata fields. Identity remains `(source, target, label)`.

**Current definition** (abridged):
```typescript
export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  sourceScope?: string;
  targetScope?: string;
  sourceAgent?: string;
  targetAgent?: string;
}
```

**v1.5.0 additions**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `similarity` | `number` | No | 0–1 float; NaN/Infinity rejected | Cosine similarity score that triggered the link during `suggest-links --auto-link`. Clamped to `[0, 1]` at write boundary. |
| `verifiedRelation` | `string` | No | Non-empty string | LLM-suggested relation label, stored as a staging area before promotion. Removed entirely after `update-edge --apply`. |

**Updated definition**:
```typescript
export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  /** Source scope identifier (e.g. 'agent-project', 'project', 'global') */
  sourceScope?: string;
  /** Target scope identifier (e.g. 'agent-project', 'project', 'global') */
  targetScope?: string;
  /** Source agent name (required when sourceScope is agent-project or agent-global) */
  sourceAgent?: string;
  /** Target agent name (required when targetScope is agent-project or agent-global) */
  targetAgent?: string;
  /**
   * Cosine similarity score (0–1) that triggered this link during suggest-links --auto-link.
   * Absent on edges created before v1.5.0 or via manual link command.
   */
  similarity?: number;
  /**
   * LLM-verified relation label staging area.
   * Written by --llm-type (suggest-links) or --verify (update-edge).
   * Removed entirely after update-edge --apply promotes it to label.
   */
  verifiedRelation?: string;
}
```

**Identity rule**: Duplicate detection in `addEdge()` continues to use `(source, target, label)`
only. `similarity` and `verifiedRelation` are NOT identity fields.

**Backward compatibility**: Existing `graph.json` files without these fields load without error.
Both fields are optional; absent fields deserialise as `undefined`.

**Note**: Keep in sync with `GraphEdge` in `types/memory.ts` (documentation layer), as noted
by the existing comment in `structure.ts`.

---

## Extended Entity: EdgeMetadata

**File**: `skills/memory/src/graph/edges.ts`

**Description**: The parameter type for optional edge metadata passed into `addEdge()`. Extended
to accept `similarity` for threading through from `suggest-links`.

**Current definition**:
```typescript
export interface EdgeMetadata {
  sourceScope?: string;
  targetScope?: string;
  sourceAgent?: string;
  targetAgent?: string;
}
```

**v1.5.0 addition**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `similarity` | `number` | No | Cosine similarity score to store on the new edge. Clamped to `[0, 1]` in `addEdge()` before writing. |

**Updated definition**:
```typescript
export interface EdgeMetadata {
  sourceScope?: string;
  targetScope?: string;
  sourceAgent?: string;
  targetAgent?: string;
  /**
   * Cosine similarity score (0–1) to store on the edge.
   * Clamped to [0, 1] defensively at write time.
   */
  similarity?: number;
}
```

**Note**: `verifiedRelation` is NOT in `EdgeMetadata`. It is set by `updateEdgeMetadata()` in
`link-update.ts` via `update-edge --verify`, not at edge creation time via `addEdge()`.

**Similarity threading call chain** (for `suggest-links --auto-link`):

```
suggest-links.ts          (scoring loop produces match.similarity)
     ↓  passes similarity: match.similarity in LinkMemoriesRequest / EdgeMetadata
link.ts → linkMemories()  (receives similarity; forwards via EdgeMetadata to addEdge)
     ↓  passes similarity in EdgeMetadata
edges.ts → addEdge()      (clamps to [0,1]; writes onto GraphEdge)
```

The `similarity` value is threaded at each step without loss. Same-scope edges only — cross-scope edge candidates skip the `similarity` field (existing read-only constraint).

---

## New Entity: UpdateEdgeRequest

**File**: `skills/memory/src/graph/link-update.ts`

**Description**: Parameters for mutating metadata fields on an existing edge.

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `sourceId` | `string` | Yes | Non-empty | Source memory ID |
| `targetId` | `string` | Yes | Non-empty | Target memory ID |
| `basePath` | `string` | Yes | Valid path | Primary scope base path for graph scan |
| `crossScopeBasePaths` | `string[]` | No | Valid paths | Additional scope base paths for cross-scope edge scan |
| `similarity` | `number` | No | 0–1; NaN/Infinity rejected | New similarity value |
| `relation` | `string` | No | Non-empty | New label value |
| `verify` | `boolean` | No | — | When true, invoke LLM and store result as verifiedRelation |
| `apply` | `boolean` | No | — | When true, promote verifiedRelation to label and remove verifiedRelation |

**Constraints**:
- `verify` and `apply` are mutually exclusive in a single call.
- At least one of `similarity`, `relation`, `verify`, or `apply` must be specified.

---

## New Entity: UpdateEdgeResponse

**File**: `skills/memory/src/graph/link-update.ts`

| Field | Type | Description |
|-------|------|-------------|
| `status` | `'success' \| 'error'` | Operation result |
| `error` | `string?` | Error message when status is `'error'` |
| `edge` | `GraphEdge?` | The updated edge state (on success) |
| `applied` | `boolean?` | True when `--apply` promoted a verifiedRelation |
| `noOp` | `boolean?` | True when `--apply` found no verifiedRelation to promote |

---

## New Entity: RelevanceScore

**File**: `skills/memory/src/maintenance/check-relevance.ts`

**Description**: The output of `check-relevance` for a single memory. Each instance is the result
of running all four scoring functions against one memory node.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Memory ID |
| `currentScope` | `string` | Yes | Current scope identifier (e.g. `'project'`, `'global'`, `'agent-project'`) |
| `suggestedScope` | `string?` | No | Recommended scope if different from current (absent when no suggestion) |
| `totalScore` | `number` | Yes | Sum of all four component scores (0–100) |
| `typeScore` | `number` | Yes | Type-match component score (0–30) |
| `tagScore` | `number` | Yes | Tag heuristics component score (0–25) |
| `connectivityScore` | `number` | Yes | Graph connectivity component score (0–25) |
| `contentScore` | `number` | Yes | Content analysis component score (0–20) |
| `confidenceBand` | `ConfidenceBand` | Yes | Classification: `'High' \| 'Medium' \| 'Low' \| 'None'` |
| `rationale` | `string` | Yes | Human-readable explanation of the score |

**Scoring breakdown**:

| Component | Max points | Input data | Notes |
|-----------|-----------|-----------|-------|
| Type match | 30 | Memory type from index | Whether the type is appropriate for the scope |
| Tag heuristics | 25 | Tags from index | Whether tags suggest a different scope |
| Graph connectivity | 25 | Inbound/outbound edges from graph | Whether connections are mostly within or outside the scope |
| Content analysis | 20 | Memory file content (only with `--format detailed`) | Keyword and length heuristics |

**Confidence band boundaries**:

| Band | Score range | Auto-move behaviour |
|------|-------------|---------------------|
| `High` | ≥80 | Moved with `--auto-move --confirm` |
| `Medium` | 60–79 | Reported; requires manual review or `--threshold` override |
| `Low` | 40–59 | Flagged for manual review; not auto-moved |
| `None` | <40 | Reported but not actioned |

---

## New Entity: OllamaService (skills/memory)

**File**: `skills/memory/src/services/ollama.ts`

**Description**: Minimal Ollama client for the memory skill CLI. Independent of `hooks/`.

| Symbol | Kind | Signature | Description |
|--------|------|-----------|-------------|
| `generate` | `function` | `(prompt: string, model?: string) => Promise<string>` | Generate text. Returns `''` on timeout/error. |
| `isAvailable` | `function` | `() => Promise<boolean>` | Returns `false` without throwing when Ollama is not running. |
| `configureClient` | `function` | `(host: string) => void` | Override the Ollama host. |
| `DEFAULT_TIMEOUT_MS` | `const` | `15000` | CLI timeout — shorter than hooks (30s). |
| `DEFAULT_CHAT_MODEL` | `const` | `'gemma3:4b'` | Default model used when `chat_model` is not configured. |

**Configuration**: Reads `chat_model` from `.claude/memory.local.md` YAML front-matter at
initialisation time. Falls back to `gemma3:4b` when the field is absent or the file does not
exist.

**No retry logic**: Unlike the hooks Ollama service, this module does not retry on failure.
CLI commands are user-interactive; a timeout produces an immediate warning and the operation
degrades gracefully.

---

## verifiedRelation Lifecycle

```
                   suggest-links --auto-link --llm-type
                            OR
                   update-edge <src> <tgt> --verify
                               |
                               v
              edge = { label: "inferred", similarity?: 0.87,
                       verifiedRelation: "superseded-by" }
                               |
                               v
                   update-edge <src> <tgt> --apply
                               |
                               v
              edge = { label: "superseded-by", similarity?: 0.87 }
                     (verifiedRelation removed entirely)
```

**State machine**:

| State | Fields present | How to enter | How to leave |
|-------|---------------|--------------|--------------|
| Unverified | `label`, `similarity?` | Edge creation; `--apply` | `--verify` or `--llm-type` |
| Staged | `label`, `similarity?`, `verifiedRelation` | `--verify` or `--llm-type` | `--apply` |
| Promoted | `label`, `similarity?` | `--apply` | Cannot revert automatically |

**`--apply` idempotency**: When called on an edge with no `verifiedRelation`, the command
succeeds silently with a no-op message. The edge is unchanged.

**`--apply` atomicity**: The apply writes the updated edge to graph file(s) using the existing
`writeFileAtomic()` pattern. Cross-scope edges require updating both graph files (non-atomic
dual-graph-save, consistent with `storeCrossScopeEdge`).
