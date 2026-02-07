---
id: learning-memory-curator-linking-prevents-orphaned-graph-nodes
title: Memory-curator linking prevents orphaned graph nodes
type: learning
scope: project
created: "2026-02-05T16:12:46.364Z"
updated: "2026-02-05T16:12:46.364Z"
tags:
  - memory-system
  - graph-health
  - linking
  - project
---

Running memory-curator agent during post-compaction restoration to link newly created memories into the knowledge graph prevents orphaned nodes. In this session: 4 orphaned nodes before → 0 after, graph connectivity 99.3% → 100%. Curator links new memories to existing feature context automatically.
