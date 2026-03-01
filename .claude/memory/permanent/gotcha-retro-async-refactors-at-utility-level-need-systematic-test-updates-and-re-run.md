---
id: gotcha-retro-async-refactors-at-utility-level-need-systematic-test-updates-and-re-run
title: Retro - Async refactors at utility level need systematic test updates and re-run
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-03-01T15:15:09.899Z"
updated: "2026-03-01T15:15:46.583Z"
tags:
  - retrospective
  - process
  - async
  - testing
  - project
severity: high
---

Commit 18805d9 made findGitRoot and related utilities async without comprehensive test updates across all 39+ dependent specs. Tests weren't re-run, allowing ~286 failures to accumulate silently. This cascaded through entire CLI because foundational scope resolution functions sit at the core of the codebase. Prevention: (1) Any async refactor of utility-level functions must flag all callers; (2) always re-run full test suite after foundational changes; (3) consider linting rules to catch Promise-type mismatches in assignments.
