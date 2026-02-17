---
id: gotcha-graph-handling-bypassed-by-early-returns-in-export-and-import-for-empty-memories
title: Gotcha - Graph handling bypassed by early returns in export and import for empty memories
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-04T21:17:54.969Z"
updated: "2026-02-16T22:30:07.081Z"
tags:
  - retrospective
  - process
  - copy-agent
  - graph-handling
  - gotcha
  - project
severity: high
---

Both exportMemories and importMemories had early return statements when the memories array was empty. These early returns happened BEFORE graph handling code was executed. When copying an agent with no memories but with graph structure, the graph was never processed. Fix: Move graph handling before any early returns, or include it in early return paths. This prevents orphaned graph data from being lost during operations that are supposed to preserve structure.
