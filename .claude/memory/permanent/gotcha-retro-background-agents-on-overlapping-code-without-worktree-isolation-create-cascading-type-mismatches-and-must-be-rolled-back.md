---
id: gotcha-retro-background-agents-on-overlapping-code-without-worktree-isolation-create-cascading-type-mismatches-and-must-be-rolled-back
title: Retro - Background agents on overlapping code without worktree isolation create cascading type mismatches and must be rolled back
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-27T00:03:10.553Z"
updated: "2026-02-27T00:04:17.297Z"
tags:
  - retrospective
  - process
  - agents
  - git
  - anti-pattern
  - project
severity: critical
---

Dispatched H13 (async I/O conversion) and H5 (O(N²) optimization) to parallel background agents without proper git worktree isolation. Both agents modified overlapping files in the work tree, causing H13's incomplete async conversion to create Promise<string> type errors cascading through multiple files. The errors looked like half-baked refactoring - because they were. Had to stop both agents and discard all uncommitted changes. LESSON: Background agents on overlapping code MUST use dedicated worktrees (git worktree add) or separate branches pulled fresh, never shared working directory. The context drift between agents creates impossible-to-debug type cascades.
