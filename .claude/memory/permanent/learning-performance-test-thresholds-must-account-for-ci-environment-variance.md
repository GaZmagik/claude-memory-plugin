---
id: learning-performance-test-thresholds-must-account-for-ci-environment-variance
title: Performance test thresholds must account for CI environment variance
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-09T10:51:59.622Z"
updated: "2026-02-16T22:30:07.286Z"
tags:
  - testing
  - performance
  - ci
  - flakiness
  - project
---

Tests expecting <10ms and <5ms completion times failed in CI with 25ms and 16ms results. CI environments are inherently slower due to resource contention. Performance thresholds should be conservative (e.g., <100ms for heuristics) to avoid flaky failures. Individual sub-operations can have tighter thresholds only when isolated in controlled benchmarks.
