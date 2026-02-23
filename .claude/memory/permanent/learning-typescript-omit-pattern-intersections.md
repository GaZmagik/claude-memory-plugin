---
id: learning-typescript-omit-pattern-intersections
title: Use Omit pattern for complex TypeScript intersections
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-22T17:31:32.097Z"
updated: "2026-02-22T17:31:42.912Z"
tags:
  - typescript
  - type-safety
  - patterns
  - project
---

Replaced any[] annotations in query.ts with proper types using Omit<IndexEntry, "id" | "scope"> & {...} for type-safe record transformations. More complex but catches subtle bugs at compile-time.
