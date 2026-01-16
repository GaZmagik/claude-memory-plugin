---
id: learning-performance-constraints-should-be-documented-upfront
title: Performance constraints should be documented upfront
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-15T18:46:20.683Z"
updated: "2026-01-16T13:44:26.591Z"
tags:
  - process
  - planning
  - performance
  - retrospective
  - project
---

Gotcha injection latency discovered in Phase 7 benchmarking (~500ms vs 50ms target) is due to Bun TypeScript compilation per invocation - a known architectural limitation. Should have documented hook performance budgets in constraints during Phase 5 design, not discovered as late surprise during Phase 7 validation.
