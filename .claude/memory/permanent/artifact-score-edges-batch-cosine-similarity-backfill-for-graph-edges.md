---
id: artifact-score-edges-batch-cosine-similarity-backfill-for-graph-edges
title: "score-edges: batch cosine similarity backfill for graph edges"
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-23T22:09:49.621Z"
updated: "2026-02-23T22:36:09.639Z"
tags:
  - score-edges
  - refresh
  - similarity
  - edges
  - maintenance
  - project
---

## Feature: memory refresh --score-edges

Adds batch cosine similarity scoring to the `memory refresh` command.

### New Files
- `graph/score-edges.ts` — `scoreEdges()` core function
- `graph/score-edges.spec.ts` — 13 unit tests (T1–T13) + T14 CLI integration

### Modified Files
- `suggest/suggest-links.ts` — exported `VALID_LABEL_RE` and `validateLlmLabel`
- `cli/commands/maintenance.ts` — added `--score-edges`, `--verify`, `--apply`, `--force` flags to `cmdRefresh()`
- `cli/command-help/entries/maintenance.ts` — updated refresh help entry with flags/examples/notes
- `cli/commands/maintenance.spec.ts` — added T14 CLI integration test

### Key Design Decisions
- Direct mutable edge mutation (like link-update.ts) — NOT the immutable updateEdge() from edges.ts, because we need `delete edge.verifiedRelation` for --apply
- `getEdges()` returns shallow array copy but same object refs, so mutating `edge.X` mutates `graph.edges[i].X` directly
- `saveGraph` called once after all mutations, not per-edge
- `--verify` and `--apply` are NOT mutually exclusive in scoreEdges (unlike updateEdgeMetadata) — T11 tests the combined pipeline
- Requires embeddings first: `memory refresh --embeddings` then `memory refresh --score-edges`

### CLI Usage
```bash
memory refresh --score-edges --dry-run
memory refresh --score-edges
memory refresh --score-edges --verify
memory refresh --score-edges --force --apply
```
