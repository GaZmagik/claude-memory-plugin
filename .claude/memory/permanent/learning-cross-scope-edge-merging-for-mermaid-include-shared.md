---
id: learning-cross-scope-edge-merging-for-mermaid-include-shared
title: Cross-scope edge merging for mermaid --include-shared
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T01:10:04.805Z"
updated: "2026-02-16T22:30:07.306Z"
tags:
  - mermaid
  - graph-merging
  - scopes
  - project
---

When mermaid --include-shared merges graphs from multiple scopes (agent, project, global), edges must be loaded from each scope's graph.json separately. The working graph accumulates all nodes, but edges are only in their respective scope graphs. Solution: call loadGraph for each basePath and merge edges.
