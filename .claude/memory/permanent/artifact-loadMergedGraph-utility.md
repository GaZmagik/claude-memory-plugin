---
id: artifact-loadMergedGraph-utility
title: loadMergedGraph() utility extracted from mermaid merge pattern
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-06T21:47:11.705Z"
updated: "2026-02-16T22:30:07.153Z"
tags:
  - project
---

Refactored repeated mermaid merge logic (lines 258-282 of graph.ts) into reusable loadMergedGraph(scopePath, globalPath) utility. Takes single-scope graph and merges cross-scope edges from global graph. Used by cmdEdges, cmdMermaid, cmdImpact. Saved 25 lines of duplicated code.
