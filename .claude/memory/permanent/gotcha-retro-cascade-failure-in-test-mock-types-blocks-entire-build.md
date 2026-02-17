---
id: gotcha-retro-cascade-failure-in-test-mock-types-blocks-entire-build
title: Retro - Cascade failure in test mock types blocks entire build
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-07T09:23:12.370Z"
updated: "2026-02-16T22:30:07.515Z"
tags:
  - retrospective
  - testing
  - typescript
  - mocking
  - project
severity: high
---

Incomplete or incorrect mock type definitions in tests (missing required properties like 'path' on AgentSummary or 'type'/'tags' on SearchResult) generate cascading TypeScript errors across multiple files. A single incomplete mock can appear as dozens of 'Property X does not exist on type {}' errors. Strategy: Always validate mock types against actual interface definitions before committing test code. Incremental mock fixes reduce error visibility and slow diagnosis.
