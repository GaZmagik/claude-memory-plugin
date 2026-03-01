---
id: gotcha-retro-cascading-async-refactors-create-half-baked-type-errors-across-multiple-files-better-as-dedicated-focused-prs
title: Retro - Cascading async refactors create half-baked type errors across multiple files; better as dedicated focused PRs
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-27T00:03:29.312Z"
updated: "2026-02-27T00:04:17.231Z"
tags:
  - retrospective
  - process
  - refactoring
  - anti-pattern
  - project
severity: high
---

When H13 agent attempted to convert sync I/O to async as part of the broader code review fixes, it left Promise<string> type diagnostics scattered across dozens of files. The refactor was non-trivial (required awaiting multiple call sites) and when left half-complete created a type error explosion. Attempted to finish it but diagnostic noise made it difficult to verify correctness. LESSON: Large refactors like sync→async conversions should NEVER be bundled into a broader code review PR. They need dedicated PRs with focus and validation. The session learned this the hard way - had to abandon the work and roll back.
