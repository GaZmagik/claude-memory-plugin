---
id: gotcha-retro-session-consumed-entirely-by-restoration-ceremony-zero-implementation-time-despite-t137-marked-inprogress
title: Retro - Session consumed entirely by restoration ceremony, zero implementation time despite T137 marked in_progress
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-06T08:50:37.554Z"
updated: "2026-02-16T22:30:07.556Z"
tags:
  - retrospective
  - process
  - restoration
  - compaction
  - work-balance
  - project
severity: medium
---

Third compaction in a single session created unintended side effect: all available tokens and time were spent on session restoration (three parallel agents × three invocations = nine agent executions total). T137 (write performance test for agent CRUD <100ms) was marked in_progress but zero code was written. Root cause was not complexity or blocking issues, but the restoration flag state management requiring multiple fix-and-retry cycles. This created a scenario where context was restored three times with identical results (vitest config gap, saveGraph mock gotcha) because tools remained blocked between attempts. Lesson: Multiple compactions in single session may indicate that the session limit is being exhausted by restoration overhead rather than actual work. Consider whether session length or token budgets need adjustment, or whether compaction should occur less frequently when restoration-heavy activity is in progress.
