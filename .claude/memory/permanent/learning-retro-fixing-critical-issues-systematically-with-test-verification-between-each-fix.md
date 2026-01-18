---
id: learning-retro-fixing-critical-issues-systematically-with-test-verification-between-each-fix
title: Retro - Fixing critical issues systematically with test verification between each fix
type: learning
scope: project
created: "2026-01-17T05:32:24.094Z"
updated: "2026-01-17T05:32:24.094Z"
tags:
  - retrospective
  - process
  - debugging
  - project
severity: medium
---

Addressed 6 critical issues (graph persistence, event listeners x3, O(n²) algorithms, permission bypass) by: (1) Fix one issue, (2) Run relevant tests, (3) Commit, (4) Move to next. This approach meant: caught regressions immediately, maintained working state, and created clean commit history. Parallel fix attempts would have created debugging chaos. Sequential verification is slower but safer.
