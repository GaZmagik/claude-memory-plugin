---
id: artifact-subagent-registry-concurrent-isolation
title: Subagent Registry - Concurrent Isolation Pattern
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-23T19:12:58.829Z"
updated: "2026-02-23T19:13:36.858Z"
tags:
  - subagent
  - concurrency
  - temp-files
  - registry
  - isolation
  - atomic-ops
  - project
---

Manages per-subagent temp files using atomic renameSync() operations to prevent race conditions during concurrent agent execution. Three hooks coordinate: SubagentStop writes unique entry, PostToolUse claims one atomically, SessionEnd sweeps remaining. Avoids silent data loss from shared temp file pattern.
