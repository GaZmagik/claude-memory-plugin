---
id: learning-hook-naming-consistency-prevents-state-deadlock
title: Hook naming consistency prevents session state deadlocks
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-16T08:14:26.905Z"
updated: "2026-01-16T13:44:26.669Z"
tags:
  - retrospective
  - process
  - hooks
  - debugging
  - project
---

Session restore approval system had naming mismatch: blocking hook checked for 'restore-recall-*' but creation hook wrote 'restore-memory-recall-*'. This caused tools to remain blocked. Solution: Ensure all hooks that reference the same approval keys use consistent naming. Pre-flight validation of hook naming patterns across paired hooks (pre/post) prevents circular dependencies during session state transitions.
