---
id: gotcha-shared-temp-file-race-simultaneous-task-subagents-conflict
title: "Shared Temp File Race: Simultaneous Task Subagents Conflict"
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T18:27:37.364Z"
updated: "2026-02-23T18:28:05.370Z"
tags:
  - concurrency
  - race-condition
  - subagents
  - temp-files
  - project
---

Single shared file /tmp/.claude-memory-plugin-last-agent-id causes last-write-wins collisions when two Task subagents finish simultaneously. PostToolUse:Task reads incorrect agent_id. Fix: unique file per subagent + scan-and-claim pattern (Tasks 5-8).
