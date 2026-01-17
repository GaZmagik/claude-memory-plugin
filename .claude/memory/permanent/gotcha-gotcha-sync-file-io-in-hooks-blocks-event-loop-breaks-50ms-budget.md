---
id: gotcha-gotcha-sync-file-io-in-hooks-blocks-event-loop-breaks-50ms-budget
title: Gotcha - Sync file I/O in hooks blocks event loop, breaks 50ms budget
type: gotcha
scope: project
created: "2026-01-17T13:19:00.225Z"
updated: "2026-01-17T13:19:00.225Z"
tags:
  - retrospective
  - performance
  - hooks
  - gotcha
  - project
severity: critical
---

Discovered critical performance issue: all hook file I/O used readFileSync/readdirSync causing hooks to exceed 50ms budget (actual: 270-1100ms). This blocks Claude Code's event loop during hook execution. Prevention: Audit hook entry points early in development to ensure ALL I/O is async. Tools like fs.promises or Deno required. Never use sync file APIs in hooks. Lesson: Performance budgets must be validated during implementation, not discovered in review phase.
