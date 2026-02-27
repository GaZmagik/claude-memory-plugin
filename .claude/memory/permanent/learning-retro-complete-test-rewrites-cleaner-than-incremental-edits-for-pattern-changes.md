---
id: learning-retro-complete-test-rewrites-cleaner-than-incremental-edits-for-pattern-changes
title: Retro - Complete test rewrites cleaner than incremental edits for pattern changes
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-27T17:16:16.683Z"
updated: "2026-02-27T17:16:35.864Z"
tags:
  - retrospective
  - process
  - testing
  - refactoring
  - project
severity: medium
---

When test mocking patterns change substantially (e.g., execFileSync → async execFile callback-based mocking), a complete rewrite of the spec file is faster and cleaner than trying to edit existing tests incrementally. The invoke.spec.ts rewrite (377 lines) went from multiple failed attempts at incremental fixes to a clean complete rewrite in one pass.
