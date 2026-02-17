---
id: gotcha-export-early-return-skips-graph-when-no-memories
title: export-early-return-skips-graph-when-no-memories
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-04T21:18:46.296Z"
updated: "2026-02-16T22:30:07.286Z"
tags:
  - export
  - graph
  - empty-set
  - bug-fix
  - project
---

The export function returned early with an emptyPackage when no memories matched the filter, but this early return did not include the graph field even when includeGraph: true was requested. This meant graph data was never exported for copies of empty agents.
