---
id: learning-dual-graphedge-definitions-typed-vs-untyped-variants
title: "Dual GraphEdge Definitions: Typed vs Untyped Variants"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T20:43:40.837Z"
updated: "2026-02-16T22:30:07.232Z"
tags:
  - architecture
  - graph
  - types
  - project
---

GraphEdge interface exists in two forms: memory.ts uses branded MemoryId types, graph/structure.ts uses plain strings. This split allows type safety at API boundaries while keeping graph traversal flexible. New cross-scope features must account for both.
