---
id: learning-tdd-caught-hook-integration-pattern-mismatch
title: TDD caught hook integration pattern mismatch
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-15T18:46:15.740Z"
updated: "2026-01-16T13:44:26.561Z"
tags:
  - process
  - tdd
  - testing
  - retrospective
  - project
---

Test failures on session-restore-approval hook revealed the colon-vs-hyphen pattern mismatch in agent naming faster than code review would have. Writing tests first identified the real integration requirement: subagent_type matches either exact name or ends-with colon-prefixed variant.
