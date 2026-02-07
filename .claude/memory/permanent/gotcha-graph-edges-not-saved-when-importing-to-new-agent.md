---
id: gotcha-graph-edges-not-saved-when-importing-to-new-agent
title: graph-edges-not-saved-when-importing-to-new-agent
type: gotcha
scope: project
created: "2026-02-04T21:18:39.775Z"
updated: "2026-02-04T21:18:39.775Z"
tags:
  - agent-copy
  - graph
  - import
  - bug-fix
  - project
---

When importing memories to a new agent directory, graph.json was not being created because the import function had an early return when memories.length === 0, causing the graph handling code to never execute. This prevented graph structure from being saved to the target agent, even when graph data was included in the export.
