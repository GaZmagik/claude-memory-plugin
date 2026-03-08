---
id: learning-parallelising-promiseall-with-unbounded-concurrent-calls-requires-safety-assumptions
title: Parallelising Promise.all with unbounded concurrent calls requires safety assumptions
type: learning
scope: project
created: "2026-03-08T21:21:47.968Z"
updated: "2026-03-08T21:21:47.968Z"
tags:
  - concurrency
  - promises
  - error-handling
  - 006-memory-summarize
  - gotcha
  - project
---

When launching unbounded concurrent generate() calls via Promise.all (e.g., per-type LLM summaries), assumes generate() never throws. If a single call fails, all pending promises reject. Mitigation: Document assumption with TODO comment and monitor error patterns. Consider Promise.allSettled if errors are recoverable.
