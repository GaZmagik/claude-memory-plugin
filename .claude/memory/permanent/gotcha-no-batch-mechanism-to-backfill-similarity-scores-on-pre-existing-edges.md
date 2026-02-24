---
id: gotcha-no-batch-mechanism-to-backfill-similarity-scores-on-pre-existing-edges
title: No batch mechanism to backfill similarity scores on pre-existing edges
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T21:26:34.592Z"
updated: "2026-02-23T21:46:06.898Z"
tags:
  - suggest-links
  - similarity
  - edges
  - update-edge
  - missing-feature
  - project
---

There is no way to compute and write semantic similarity scores onto pre-existing graph edges in batch.

What exists:
- update-edge --similarity <n>: manual, one at a time, caller supplies the value
- update-edge --verify: calls Ollama to suggest a relation LABEL only, never touches similarity
- suggest-links --auto-link: writes similarity at edge CREATION time only; never backfills pre-existing edges

Consequence: manually-created edges (via memory link or bulk-link) always have similarity=undefined. Re-running suggest-links --auto-link only creates new edges, skipping existing ones.

Building blocks for a fix are present (cosineSimilarity() in search/similarity.ts, loadEmbeddingCache, getEdges()) but not wired into any command. Would require a new memory refresh --backfill-similarities flag or similar.

Verified by inspecting: graph/link-update.ts (update-edge), suggest/suggest-links.ts, graph/edges.ts, search/similarity.ts
