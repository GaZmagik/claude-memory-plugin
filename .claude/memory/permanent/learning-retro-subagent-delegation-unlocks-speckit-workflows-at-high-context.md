---
id: learning-retro-subagent-delegation-unlocks-speckit-workflows-at-high-context
title: Retro - Subagent delegation unlocks speckit workflows at high context
type: learning
scope: project
created: "2026-01-25T09:56:29.936Z"
updated: "2026-01-25T09:56:29.936Z"
tags:
  - retrospective
  - speckit
  - workflow
  - context-management
  - project
severity: medium
---

When main session approaches context exhaustion (>90%), delegate speckit:implement to subagent rather than forcing sequential task creation in main. Subagents get fresh context budgets and can complete entire phases efficiently. Pattern: main session handles restoration/validation, delegates implementation to subagent. Applies to any workflow that benefits from separate context window.
