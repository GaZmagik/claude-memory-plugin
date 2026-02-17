---
id: gotcha-retro-fifth-compaction-in-one-session-id-indicates-context-window-exhaustion-pattern
title: Retro - Fifth compaction in one session ID indicates context window exhaustion pattern
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-06T07:11:28.237Z"
updated: "2026-02-16T22:30:07.509Z"
tags:
  - retrospective
  - process
  - compaction
  - context-management
  - project
severity: high
---

This session was the fifth compaction cycle using the same session ID (30cbe45c-e4e1-474a-ae08-9c9a785b1dbd). Compaction is being triggered rapidly despite normal token usage, suggesting either: (1) token budget is being consumed unexpectedly (hooks, tool execution), or (2) the feature is genuinely consuming more context than anticipated. Rapid compactions create cognitive friction: restoration ceremonies take minutes, summaries become stale, and context recovery becomes necessary before starting work. If compaction occurs more than 2-3 times per feature branch, investigate root cause (excessive logging, large tool outputs, verbose hooks).
