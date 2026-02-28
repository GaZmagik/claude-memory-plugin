---
id: gotcha-retro-automated-code-review-findings-snapshot-decay-review-findings-against-git-history-before-investing-in-fixes
title: "Gotcha - Retro - Automated code review findings snapshot decay: review findings against git history before investing in fixes"
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-27T19:21:00.116Z"
updated: "2026-02-27T19:22:08.460Z"
tags:
  - retrospective
  - gotcha
  - code-review
  - git
  - project
severity: high
---

This session involved 64 code review findings from a snapshot taken 2026-02-26. By 2026-02-27, many findings had already been addressed in intervening commits (H14, M2, M3, M4, M10, M8, M13, M20, M21, M23). When receiving bulk code review findings, always: 1) Check git log to see if findings are already fixed, 2) Verify the issue exists in current code, 3) Only then attempt fixes. Saves significant investigation overhead.
