---
id: gotcha-typescript-type-mismatch-between-graphstructurets-and-typesmemoryts
title: TypeScript type mismatch between graph/structure.ts and types/memory.ts
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-19T13:25:05.618Z"
updated: "2026-02-19T13:25:37.356Z"
tags:
  - typescript
  - type-system
  - graph-nodes
  - project
---

Pre-existing type errors in maintenance.ts:317 and sync.ts:352 due to GraphNode using string IDs vs MemoryId branded types. Errors don't affect runtime—tests pass despite type warnings. Likely requires refactoring GraphNode type to use MemoryId.
