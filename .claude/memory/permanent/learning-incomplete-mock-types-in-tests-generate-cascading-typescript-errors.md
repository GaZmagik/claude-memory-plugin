---
id: learning-incomplete-mock-types-in-tests-generate-cascading-typescript-errors
title: Incomplete mock types in tests generate cascading TypeScript errors
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T23:49:58.191Z"
updated: "2026-02-16T22:30:07.337Z"
tags:
  - typescript
  - testing
  - type-safety
  - mocks
  - project
---

75 TypeScript compiler errors in test files, mostly from incomplete mock interfaces (e.g., LinkMemoriesRequest missing discriminated union constraints). Mocks must match source types exactly or --noImplicitAny catches drift.
