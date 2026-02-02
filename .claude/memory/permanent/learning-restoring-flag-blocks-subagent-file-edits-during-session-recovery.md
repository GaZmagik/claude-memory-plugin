---
id: learning-restoring-flag-blocks-subagent-file-edits-during-session-recovery
title: Restoring flag blocks subagent file edits during session recovery
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-25T09:58:53.053Z"
updated: "2026-02-01T22:38:06.855Z"
tags:
  - session-restore
  - flags
  - subagents
  - gotcha
  - project
---

When /session-restore creates a restoring-{sessionId} flag, subagents attempting to modify files (e.g., marking tasks complete in tasks.md) are blocked. Flag must be removed before subagent file operations can succeed. This prevented Phase 0 tasks from being marked [X] until flag cleanup.
