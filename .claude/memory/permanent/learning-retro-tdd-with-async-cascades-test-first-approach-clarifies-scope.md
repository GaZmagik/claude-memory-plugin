---
id: learning-retro-tdd-with-async-cascades-test-first-approach-clarifies-scope
title: "Retro - TDD with async cascades: test-first approach clarifies scope"
type: learning
scope: project
created: "2026-01-18T16:20:27.005Z"
updated: "2026-01-18T16:20:27.005Z"
tags:
  - retrospective
  - process
  - tdd
  - async-refactoring
  - project
severity: medium
---

When converting sync to async across a codebase, TDD (converting tests first, then implementation) provides clear feedback on the cascade scope. Converting fs-utils tests to async immediately revealed which callers needed changes (think/state.ts, etc.) without waiting for implementation errors. This is more efficient than discovering cascade points during implementation.
