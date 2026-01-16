---
id: learning-retro-ephemeral-files-belong-in-tmp-not-project-directories
title: Retro - Ephemeral files belong in /tmp/ not project directories
type: learning
scope: project
created: "2026-01-16T22:28:04.255Z"
updated: "2026-01-16T22:28:04.255Z"
tags:
  - retrospective
  - process
  - cleanup
  - infrastructure
  - project
severity: medium
---

Session context files (claude-context-*.txt) and wrapper scripts (claude-wrapper-*.sh) are transient - only needed during execution. Moving them from .claude/logs/ to /tmp/ with signal traps (EXIT, INT, TERM) is cleaner. If cleanup fails, OS clears /tmp/ on reboot rather than leaving project clutter.
