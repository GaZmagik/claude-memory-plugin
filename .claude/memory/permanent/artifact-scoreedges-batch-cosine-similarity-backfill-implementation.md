---
id: artifact-scoreedges-batch-cosine-similarity-backfill-implementation
title: "scoreEdges: batch cosine similarity backfill implementation"
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-23T22:36:00.811Z"
updated: "2026-02-23T22:36:09.601Z"
tags:
  - score-edges
  - refresh
  - batch
  - similarity
  - graph
  - edges
  - project
---

Implements batch computation of cosine similarity for graph edges with available embeddings. Uses direct mutable edge mutation (not immutable pattern) because --apply flag needs to delete edge.verifiedRelation. Graph saved exactly once after all mutations regardless of edge count.
