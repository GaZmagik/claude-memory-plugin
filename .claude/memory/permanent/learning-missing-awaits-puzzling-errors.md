---
id: learning-missing-awaits-puzzling-errors
title: Missing awaits on async functions create puzzling type mismatch errors
type: learning
scope: project
created: "2026-03-01T15:18:11.957Z"
updated: "2026-03-01T15:18:11.957Z"
tags:
  - debugging
  - async
  - promises
  - typescript
  - project
---

When async functions arent awaited, Promises are passed where primitives expected (e.g., Promise passed to path.join() expecting string). Error message talks about type mismatches rather than the root cause (missing await). Always check tsc output and Promise { <pending> } values in test failures first—they often reveal missing awaits rather than actual type errors.
