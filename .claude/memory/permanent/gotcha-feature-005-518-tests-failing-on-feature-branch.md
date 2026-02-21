---
id: gotcha-feature-005-518-tests-failing-on-feature-branch
title: "Feature 005: 518 tests failing on feature branch"
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-21T07:49:03.375Z"
updated: "2026-02-21T08:58:05.121Z"
tags:
  - feature-005
  - tests
  - regression
  - critical
  - blocking
  - project
---

Comprehensive test run shows 518 failures (11% failure rate) with 4194 passing. Failures concentrated in copyAgent tests with 'Source agent not found' errors. Root cause not yet identified but suggests breaking changes or test infrastructure issues. Must be resolved before merge.
