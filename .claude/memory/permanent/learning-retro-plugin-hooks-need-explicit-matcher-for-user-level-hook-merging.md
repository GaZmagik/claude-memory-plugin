---
id: learning-retro-plugin-hooks-need-explicit-matcher-for-user-level-hook-merging
title: Retro - Plugin hooks need explicit matcher for user-level hook merging
type: learning
scope: project
created: "2026-01-26T22:33:32.318Z"
updated: "2026-01-26T22:33:32.318Z"
tags:
  - retrospective
  - hooks
  - pattern
  - project
severity: medium
---

PostToolUse hooks in plugin hooks.json didn't have a matcher field. Claude Code doesn't merge hooks without explicit matcher. Adding matcher: "*" fixed the merging. Always use explicit matcher in plugin hooks.
