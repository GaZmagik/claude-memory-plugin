---
id: gotcha-async-cascade-incomplete-updates
title: Async function refactoring requires cascading updates to source AND tests
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-03-01T15:13:28.436Z"
updated: "2026-03-01T15:15:46.567Z"
tags:
  - async
  - refactoring
  - testing
  - type-safety
  - project
---

Commit 18805d9 made findGitRoot async (fs/promises instead of accessSync) but didnt update ~50+ callers in source files and tests. Result: 286 test failures + confusing Promise type errors. When converting sync→async, must update: call sites in source, test expectations, type annotations, AND run tsc to catch remaining issues. This is a comprehensive operation, not a localised change.
