---
id: learning-retro-subagent-delegation-pattern-bypasses-context-ceiling-for-multi-phase-tasks
title: Retro - Subagent delegation pattern bypasses context ceiling for multi-phase tasks
type: learning
scope: project
created: "2026-01-25T09:58:30.075Z"
updated: "2026-01-25T09:58:30.075Z"
tags:
  - retrospective
  - process
  - context-management
  - subagents
  - workflow
  - project
severity: high
---

When main session approaches context limits during large workflows (103+ tasks across 5 phases), spawning a dedicated subagent with fresh context budget completes entire phases without stalling. Speckit Phase 0 completed in ~10min via speckit-expert subagent when main was at 92% context. Pattern: recognize context ceiling → delegate phase to scoped subagent → report results → proceed. Avoids premature session termination and unlocks parallelism.
