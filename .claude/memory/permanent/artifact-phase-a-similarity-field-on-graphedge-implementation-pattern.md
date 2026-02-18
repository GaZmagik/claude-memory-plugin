---
id: artifact-phase-a-similarity-field-on-graphedge-implementation-pattern
title: "Phase A: similarity field on GraphEdge — implementation pattern"
type: artifact
scope: project
created: "2026-02-18T13:04:36.263Z"
updated: "2026-02-18T13:04:36.263Z"
tags:
  - v1.5.0
  - phase-a
  - similarity
  - graph-edge
  - tdd
  - project
---

## Phase A: Similarity on Edges

### What was done
Added optional `similarity?: number` field to GraphEdge, threaded cosine similarity from suggest-links --auto-link through to stored edges.

### Files modified
- `graph/structure.ts` — GraphEdge interface (T008)
- `types/memory.ts` — GraphEdge sync copy (T009)
- `graph/edges.ts` — EdgeMetadata + addEdge() clamp/validate logic (T010)
- `types/operations.ts` — LinkMemoriesRequest.similarity field
- `suggest/suggest-links.ts` — thread suggestion.similarity to linkMemories() same-scope only (T011)
- `graph/link.ts` — thread request.similarity to addEdge() via EdgeMetadata (T012)

### Key patterns
- Duplicate detection is identity-only (source, target, label) — similarity is NOT part of identity
- NaN rejected with descriptive error; out-of-range clamped with Math.min(1, Math.max(0, s))
- Cross-scope path (storeCrossScopeEdge) does NOT receive similarity
- link.ts already imported EdgeMetadata — just extend existing metadata object
- suggest-links.spec.ts uses vitest vi.spyOn pattern (not bun:test)

### Test counts
- edges.spec.ts: 37 tests
- structure.spec.ts: 31 tests
- suggest-links.spec.ts: 9 tests
- Full suite: 2538 pass, 0 fail
