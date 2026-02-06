---
id: learning-retro-tdd-for-type-level-changes-validates-at-compile-time
title: Retro - TDD for type-level changes validates at compile time
type: learning
scope: project
created: "2026-02-06T08:02:16.873Z"
updated: "2026-02-06T08:02:16.873Z"
tags:
  - retrospective
  - tdd
  - typescript
  - project
severity: medium
---

When writing tests for TypeScript interface changes, the type system itself becomes the failing assertion. Writing the test first (fails at tsc check time, even if vitest passes) then implementing validates the change. T130: write test → tsc fails → implement → tsc green, 22 existing tests untouched. Clean and effective.
