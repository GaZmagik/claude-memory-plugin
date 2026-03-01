---
id: learning-adjacency-list-optimization-for-graph-edge-lookups
title: Adjacency list optimization for graph edge lookups
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-27T19:20:56.525Z"
updated: "2026-02-27T19:22:08.313Z"
tags:
  - graph-optimization
  - performance
  - pattern
  - project
---

Build adjacency lists once before loops to convert O(N×E) operations to O(N). Discovered in sync-frontmatter: replacing getOutboundEdges() calls inside a loop with a pre-built outbound map eliminated O(E) scans per iteration.
