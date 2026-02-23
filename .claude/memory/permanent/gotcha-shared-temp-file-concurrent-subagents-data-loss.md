---
id: gotcha-shared-temp-file-concurrent-subagents-data-loss
title: Shared Temp File Patterns with Concurrent Subagents Cause Silent Data Loss
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T19:13:11.757Z"
updated: "2026-02-23T19:13:36.859Z"
tags:
  - subagent
  - concurrency
  - race-condition
  - temp-files
  - debugging
  - project
---

A single shared temp file (e.g., `/tmp/.claude-memory-plugin-last-agent-id`) cannot safely handle multiple concurrent subagents. Last-write-wins semantics silently overwrite previous entries. Solved by per-subagent files with atomic renameSync() claiming.
