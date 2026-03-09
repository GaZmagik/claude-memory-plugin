---
id: gotcha-agent-test-generation-false-positive-diagnostics
title: Agent-Generated Tests Report False Positive TS Diagnostics
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-03-08T19:23:20.615Z"
updated: "2026-03-08T19:23:30.075Z"
tags:
  - feature-006
  - testing
  - typescript
  - diagnostics
  - project
---

When agents generate tests and imports are placed at the top of the file, tsc --noEmit reports 'unused imports' even though they're used in test bodies below the visible range. This is a false positive from the diagnostic system only seeing the top of file. Validate by running tests themselves, not just TS check.
