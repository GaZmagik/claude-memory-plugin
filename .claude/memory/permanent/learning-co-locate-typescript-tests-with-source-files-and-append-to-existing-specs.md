---
id: learning-co-locate-typescript-tests-with-source-files-and-append-to-existing-specs
title: Co-locate TypeScript tests with source files and append to existing specs
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-19T08:44:43.593Z"
updated: "2026-02-19T08:45:35.756Z"
tags:
  - testing
  - typescript
  - architecture
  - project
---

Extend existing .spec.ts files rather than creating separate test files. When adding MemoryType.Rule, append to enums.spec.ts. This follows project conventions and keeps test/source relationship clear.
