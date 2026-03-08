---
id: learning-cli-flag-precedence-and-silent-override-pattern
title: CLI flag precedence and silent override pattern
type: learning
scope: project
created: "2026-03-08T21:22:00.388Z"
updated: "2026-03-08T21:22:00.388Z"
tags:
  - cli-design
  - ux
  - flag-precedence
  - 006-memory-summarize
  - project
---

When CLI supports both --all-agents and --agent flags with implicit precedence, document interaction explicitly and warn via stderr when both provided. Example: --all-agents overrides --agent without warning was confusing UX. Now emits warning so user sees the precedence behaviour.
