---
id: gotcha-prompt-improver-forked-sessions-leak-processes
title: Prompt improver forked sessions leak processes causing slowdowns
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-31T07:41:47.788Z"
updated: "2026-02-01T22:38:06.484Z"
tags:
  - prompt-improver
  - performance
  - resource-leak
  - subprocess-cleanup
  - v1.2.0
  - project
severity: high
---

The claude-prompt-improver plugin spawns forked Claude sessions with --fork-session flag. These sessions create child processes (LSP servers, node processes) but don't terminate properly, accumulating over time. Observed 124+ processes after several hours of use, causing severe system slowdowns. Root cause: subprocess cleanup not implemented in forked session termination. Workaround: Periodically kill leaked Claude processes or disable plugin temporarily. Fix needed: Implement proper process.on('exit') cleanup in prompt improver.
