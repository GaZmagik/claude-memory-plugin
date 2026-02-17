---
id: decision-parallel-restoration-agents-accelerate-post-compaction-recovery
title: Parallel restoration agents accelerate post-compaction recovery
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-05T16:11:33.445Z"
updated: "2026-02-16T22:30:07.468Z"
tags:
  - phase-e
  - post-compaction
  - agents
  - memory-system
  - project
---

Decided to launch memory-recall, memory-curator, and check-gotchas agents in parallel during post-compaction session-restore. This maximises efficiency by leveraging independent agent context budgets whilst main session has fresh context (~5% used). Each agent targets specific restoration concern: context recall, memory linking/quality audit, and gotcha detection.
