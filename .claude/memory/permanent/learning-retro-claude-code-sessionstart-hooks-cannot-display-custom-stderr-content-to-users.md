---
id: learning-retro-claude-code-sessionstart-hooks-cannot-display-custom-stderr-content-to-users
title: Retro - Claude Code SessionStart hooks cannot display custom stderr content to users
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-17T19:14:35.588Z"
updated: "2026-02-01T22:38:06.543Z"
tags:
  - retrospective
  - hooks
  - claude-code
  - limitations
  - project
severity: high
---

SessionStart hook output visibility limitation: exit code 2 + stderr does NOT display message content to users, despite Claude Code documentation. Only exit 0 + stdout (to AI context) or exit 2 (to AI as blocking error) work. Message displays in AI context but not user terminal. For user-facing setup instructions, consider UserPromptSubmit hooks instead.
