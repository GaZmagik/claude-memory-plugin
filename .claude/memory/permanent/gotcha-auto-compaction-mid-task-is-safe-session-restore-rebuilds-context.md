---
id: gotcha-auto-compaction-mid-task-is-safe-session-restore-rebuilds-context
title: Auto-compaction mid-task is safe - session-restore rebuilds context
type: gotcha
scope: project
created: "2026-01-25T16:16:35.097Z"
updated: "2026-01-25T16:16:35.097Z"
tags:
  - context-management
  - auto-compaction
  - session-restore
  - process
  - v1.1.0
  - project
---

When auto-compaction is enabled, compacting mid-implementation is acceptable. The session-restore workflow (with parallel memory-recall, curator, and check-gotchas agents) restores context from memory, tasks.md, and git state, allowing work to resume seamlessly.

**When to worry about context:**
- Auto-compaction OFF: Stop at 85-90% to avoid mid-work interruption
- Auto-compaction ON: Let it compact naturally; session-restore handles continuity

**Why this works:**
1. PreCompact hooks preserve state (git commit, handover, memory capture)
2. Session-restore spawns 3 agents to rebuild context in parallel
3. tasks.md tracks progress; session-continue presents next steps

**Relates to:** gotcha-stop-work-at-85-90-context-not-95-100 (applies when auto-compaction disabled)
