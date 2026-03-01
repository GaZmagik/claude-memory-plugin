---
id: gotcha-viusefaketimers-hangs-bun-test-runner-in-concurrent-file-execution
title: vi.useFakeTimers hangs Bun test runner in concurrent file execution
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-25T23:39:25.730Z"
updated: "2026-02-26T14:11:47.336Z"
tags:
  - bun
  - vitest
  - testing
  - fake-timers
  - project
---

vi.useFakeTimers causes bun test runner to hang indefinitely when test files run concurrently. The fake timers freeze Bun's internal timers used for process management. Fix: use real delays (setTimeout with await) or vi.spyOn(Date.prototype) instead. Only safe to use under bunx vitest run.
