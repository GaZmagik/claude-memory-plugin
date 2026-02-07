---
id: decision-subprocess-timeout-cleanup-should-use-destroy-not-manual-listeners
title: Subprocess Timeout Cleanup Should Use destroy() Not Manual Listeners
type: decision
scope: project
project: claude-memory-plugin
created: "2026-01-26T00:12:10.735Z"
updated: "2026-02-01T22:38:07.008Z"
tags:
  - nodejs
  - subprocess
  - race-conditions
  - security-fix
  - project
---

When implementing timeout handlers for child processes, use process.destroy() to clean up all event listeners and file descriptors in one call, rather than manually removing specific listeners. This prevents race conditions where listeners fire after timeout signal.
