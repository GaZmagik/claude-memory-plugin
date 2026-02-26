---
id: gotcha-type-changes-in-parallel-agents-create-cascading-diagnostics
title: Type changes in parallel agents create cascading diagnostics
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-26T21:58:30.268Z"
updated: "2026-02-26T21:59:31.159Z"
tags:
  - typescript
  - parallel-agents
  - diagnostics
  - code-review
  - project
---

When background agents modify core types (e.g., GraphNode.type string→MemoryType), TypeScript diagnostics ripple through all dependents. Diagnostics may lag or persist until explicit refresh. Suppress false positives or refresh language server cache.
