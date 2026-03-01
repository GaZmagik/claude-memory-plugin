---
id: learning-retro-full-test-suite-validation-revealed-net-improvement-despite-high-failure-count
title: Retro - Full test suite validation revealed net improvement despite high failure count
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-26T21:57:57.870Z"
updated: "2026-02-26T21:59:31.119Z"
tags:
  - retrospective
  - process
  - testing
  - validation
  - project
severity: medium
---

Running the full test suite after each phase uncovered that the branch fixed 23 tests relative to main (334 failures vs main's 357). Without this validation, the session would have perceived the work as unsuccessful due to the high absolute failure count. The practice of comparing against baseline main, not absolute zero, is crucial for assessing incremental improvements. This prevented premature pessimism and confirmed that security/performance fixes were not introducing regressions.
