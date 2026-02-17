---
id: learning-multi-scope-result-merging-pattern-with-scope-indicators
title: Multi-scope result merging pattern with scope indicators
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-04T09:48:21.576Z"
updated: "2026-02-16T22:30:07.196Z"
tags:
  - pattern
  - multi-scope
  - search
  - scope-indicators
  - feature-003
  - project
---

When implementing multi-scope search across agent, project, and global scopes, format results with scope indicators like [agent-project], [project], [global] to show provenance. Use resolveSharedScopePaths() to get prioritised list of scope paths, then merge results while preserving which scope each memory came from.
