---
id: learning-graph-structure-filtered-to-exported-memories-only
title: graph-structure-filtered-to-exported-memories-only
type: learning
scope: project
created: "2026-02-04T21:18:54.070Z"
updated: "2026-02-04T21:18:54.070Z"
tags:
  - agent-copy
  - graph
  - design
  - export-filter
  - project
---

Agent copy correctly filters the graph structure to only include nodes and edges for memories that are actually being exported. This means orphaned nodes (in graph.json but not in index.json) are not copied, which is the intended design per gotcha-bulk-move-loses-graph-edges.
