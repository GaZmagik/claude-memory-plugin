---
id: artifact-hook-system-patterns-catalogue
title: Hook System Patterns Catalogue
type: hub
scope: project
created: "2026-01-13T08:06:13.533Z"
updated: "2026-01-13T13:22:18.293Z"
tags:
  - hooks
  - patterns
  - claude-code
  - hub
  - project
---

# Hook System Patterns Catalogue

Hook types: PreToolUse, PostToolUse, PreCompact, SessionEnd, UserPromptSubmit

Key patterns:
- Selective blocking with whitelists
- Graceful degradation (fail gracefully)
- Pattern matching precision (avoid blocking legitimate ops)

Gotchas: Hook-created memories need linking.
