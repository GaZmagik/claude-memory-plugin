---
id: learning-plugin-posttooluse-hooks-not-auto-discovered
title: Plugin PostToolUse hooks not auto-discovered by Claude Code
type: learning
scope: project
created: "2026-01-26T22:34:06.358Z"
updated: "2026-01-26T22:34:06.358Z"
tags:
  - hooks
  - plugin-discovery
  - claudecode
  - workaround
  - project
---

Claude Code does not auto-merge plugin PostToolUse hooks with user-level hooks in ~/.claude/settings.json. SessionStart and UserPromptSubmit work, but PostToolUse requires manual workaround: either add explicit 'matcher: "*"' to hooks.json or manually add hook command to user settings. Bug report candidate for Claude Code.
