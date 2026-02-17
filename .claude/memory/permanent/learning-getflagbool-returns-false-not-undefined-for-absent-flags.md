---
id: learning-getflagbool-returns-false-not-undefined-for-absent-flags
title: getFlagBool returns false not undefined for absent flags
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T01:46:18.725Z"
updated: "2026-02-16T22:30:07.464Z"
tags:
  - flag-handling
  - command-patterns
  - type-safety
  - project
---

In suggest-links command helpers, getFlagBool() returns false (not undefined) when a flag is absent. This gotcha affects conditional logic in command handlers - must check 'if (value === true)' not 'if (value)'.
