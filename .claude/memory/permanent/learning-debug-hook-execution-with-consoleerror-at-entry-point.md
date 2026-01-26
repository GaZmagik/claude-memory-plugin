---
id: learning-debug-hook-execution-with-consoleerror-at-entry-point
title: Debug hook execution with console.error at entry point
type: learning
scope: project
created: "2026-01-26T22:52:53.198Z"
updated: "2026-01-26T22:52:53.198Z"
tags:
  - hooks
  - debugging
  - pattern
  - v1.1.2
  - project
---

To diagnose if a hook is running at all, add console.error("[DEBUG] <hook-name> invoked") at the very start of the hook file. This bypasses all logic and confirms whether Claude Code is even calling the hook. Useful when hooks fail silently due to missing dependencies or configuration issues.
