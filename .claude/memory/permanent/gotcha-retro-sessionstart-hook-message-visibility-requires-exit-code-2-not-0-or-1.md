---
id: gotcha-retro-sessionstart-hook-message-visibility-requires-exit-code-2-not-0-or-1
title: Retro - SessionStart hook message visibility requires exit code 2, not 0 or 1
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-17T17:17:27.255Z"
updated: "2026-02-01T22:38:05.902Z"
tags:
  - retrospective
  - hooks
  - ux
  - project
  - message-visibility
severity: high
---

Exit code 0 (allow) makes messages blend with other startup output. Exit code 1 (warn) shows as 'hook error' but can appear alarming. For SessionStart hooks that need user attention (setup instructions), use exit code 2 (block) to make the message stand out unmistakably. Initial approach (exit 0, stdout) was too quiet; should have started with 'fail loud'.
