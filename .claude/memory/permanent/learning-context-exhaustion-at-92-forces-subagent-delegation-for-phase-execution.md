---
id: learning-context-exhaustion-at-92-forces-subagent-delegation-for-phase-execution
title: Context exhaustion at 92%+ forces subagent delegation for phase execution
type: learning
scope: project
created: "2026-01-25T09:58:56.761Z"
updated: "2026-01-25T09:58:56.761Z"
tags:
  - context-management
  - subagents
  - speckit
  - implementation
  - project
---

Main session reached 92% context during Phase 0 preparation. Attempting /speckit:implement with 103 tasks would exhaust context immediately. Solution: delegate to speckit-expert subagent with fresh context budget. Subagent completed Phase 0 (T001–T006) in ~10 minutes. Pattern: Use subagents for large implementation phases when main session context exceeds 85%.
