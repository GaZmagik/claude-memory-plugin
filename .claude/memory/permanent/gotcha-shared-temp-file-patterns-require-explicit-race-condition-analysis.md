---
id: gotcha-shared-temp-file-patterns-require-explicit-race-condition-analysis
title: Gotcha - Shared temp file patterns require explicit race condition analysis
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T18:26:46.863Z"
updated: "2026-02-23T18:28:05.387Z"
tags:
  - retrospective
  - process
  - concurrency
  - gotcha
  - project
severity: high
---

Initial implementation used `/tmp/.claude-memory-plugin-last-agent-id` as a single shared temp file for inter-process agent ID handoff. This is vulnerable when multiple Task subagents terminate simultaneously - last writer wins, causing the parent PostToolUse:Task to spawn agent-commit for the wrong session. Pattern: any shared temp file for cross-process coordination needs per-scope/per-session namespacing or atomic operations. In this case, fixed by moving to per-subagent unique files via subagent-registry utility. Lesson: coordinate up-front on collision handling rather than discovering it during code review.
