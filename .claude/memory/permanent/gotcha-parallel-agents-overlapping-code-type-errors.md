---
id: gotcha-parallel-agents-overlapping-code-type-errors
title: Parallel agents on overlapping code create cascading type errors
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-27T00:03:50.352Z"
updated: "2026-02-27T00:04:17.161Z"
tags:
  - agents
  - background-tasks
  - type-safety
  - debugging
  - parallel-execution
  - project
---

When dispatching parallel background agents (e.g., H5 optimising suggestLinks, H13 converting sync I/O) to work on overlapping files without worktree isolation, changes cascade polluting the working tree with hard-to-debug Promise<T> type mismatches. The H5/H13 session generated diagnostics across dozens of files that had to be reverted. Agents' changes evaporated on worktree cleanup due to lack of auto-commit.
