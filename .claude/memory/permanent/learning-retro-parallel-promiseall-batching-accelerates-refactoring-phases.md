---
id: learning-retro-parallel-promiseall-batching-accelerates-refactoring-phases
title: Retro - Parallel promise.all batching accelerates refactoring phases
type: learning
scope: project
created: "2026-03-08T21:21:46.187Z"
updated: "2026-03-08T21:21:46.187Z"
tags:
  - retrospective
  - refactoring
  - performance
  - project
severity: medium
---

When applying multiple refactoring patterns across a codebase (e.g., summarise, discovery, listing operations), grouping async operations into Promise.all() calls early reduces iteration time and token overhead. Pattern: identify all parallelisable async work, batch it, then verify in one test run rather than iterative test-fix cycles.
