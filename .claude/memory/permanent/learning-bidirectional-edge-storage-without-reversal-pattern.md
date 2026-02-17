---
id: learning-bidirectional-edge-storage-without-reversal-pattern
title: Bidirectional edge storage without reversal pattern
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T21:00:52.872Z"
updated: "2026-02-16T22:30:07.283Z"
tags:
  - phase-d
  - graph
  - pattern
  - bidirectional
  - project
---

Cross-scope edges are stored identically (not reversed) in both graphs. This preserves directionality and semantics. StoreCrossScopeEdge() writes the edge to source graph, resolves target scope path, loads target graph, adds edge, saves target graph. RemoveCrossScopeEdge() scans source graph for matching edges and removes from both. Best-effort cleanup on missing target graph.
