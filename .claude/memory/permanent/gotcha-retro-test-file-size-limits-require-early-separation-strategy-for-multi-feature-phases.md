---
id: gotcha-retro-test-file-size-limits-require-early-separation-strategy-for-multi-feature-phases
title: Retro - Test file size limits require early separation strategy for multi-feature phases
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-06T21:00:38.853Z"
updated: "2026-02-16T22:30:07.572Z"
tags:
  - retrospective
  - process
  - testing
  - file-organization
  - project
severity: medium
---

During Phase D implementation, test files approached 392-line hook threshold multiple times when attempting to add tests to existing spec files (edges.spec.ts, link.spec.ts). This created friction: either split tests into new files proactively, or hit the limit mid-task. Solution: For multi-phase TDD work, create dedicated test files for each feature/component at the outset (cross-scope-edges.spec.ts, cross-scope-link.spec.ts) rather than appending to existing tests. Prevents mid-task file rewrites and keeps related tests together semantically.
