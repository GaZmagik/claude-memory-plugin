---
id: artifact-hook-system-patterns-catalogue
title: Hook System Patterns Catalogue
type: hub
scope: project
project: claude-memory-plugin
created: "2026-01-13T08:06:13.533Z"
updated: "2026-01-13T19:02:56.187Z"
tags:
  - hooks
  - patterns
  - claude-code
  - hub
  - project
links:
  - decision-session-continuity-strategy
  - artifact-memory-system-architecture-reference
---

# Hook System Patterns Catalogue

Hook types: PreToolUse, PostToolUse, PreCompact, SessionEnd, UserPromptSubmit

Key patterns:
- Selective blocking with whitelists
- Graceful degradation (fail gracefully)
- Pattern matching precision (avoid blocking legitimate ops)

Gotchas: Hook-created memories need linking.
