---
id: gotcha-import-early-returns-bypass-graph-relationship-linkage
title: Import early returns bypass graph relationship linkage
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-04T22:44:10.498Z"
updated: "2026-02-16T22:30:07.547Z"
tags:
  - import
  - export
  - graph
  - bug
  - critical
  - project
---

The import() function had two early return paths that skipped graph relationship processing: (1) when data.memories.length === 0, (2) when request.dryRun === true. These bypassed the subsequent graph edge linking via linkMemories(). Fix: Move graph handling before early returns, or ensure all return paths process graph data. Also: Direct graph manipulation (loadGraph/saveGraph) bypasses linkMemories validation - use linkMemories for consistency.
