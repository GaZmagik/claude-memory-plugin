---
id: decision-subagent-memory-isolation-via-per-agent-registry
title: Subagent Memory Isolation via Per-Agent Registry
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-23T19:13:16.649Z"
updated: "2026-02-23T19:13:36.815Z"
tags:
  - subagent
  - architecture
  - concurrency
  - registry
  - isolation
  - project
---

Replaced shared `/tmp/.claude-memory-plugin-last-agent-id` with per-subagent registry files. Each subagent writes unique temp file, PostToolUse claims atomically via renameSync(), SessionEnd sweeps remaining. Ensures no silent data loss and provides full isolation for concurrent execution.
