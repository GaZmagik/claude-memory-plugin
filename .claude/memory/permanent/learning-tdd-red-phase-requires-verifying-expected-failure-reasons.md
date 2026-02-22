---
id: learning-tdd-red-phase-requires-verifying-expected-failure-reasons
title: TDD RED phase requires verifying expected failure reasons
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-19T08:44:35.645Z"
updated: "2026-02-19T08:45:35.896Z"
tags:
  - tdd
  - testing
  - red-phase
  - project
---

When writing tests first, do not just confirm tests fail - verify they fail for the RIGHT reasons. Running bun test shows specific assertion failures (count mismatches, undefined properties) that guide implementation precisely. This prevents accidentally passing tests due to unrelated fixes.
