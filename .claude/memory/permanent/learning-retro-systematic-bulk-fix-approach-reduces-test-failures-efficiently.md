---
id: learning-retro-systematic-bulk-fix-approach-reduces-test-failures-efficiently
title: Retro - Systematic bulk fix approach reduces test failures efficiently
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-04T16:56:47.574Z"
updated: "2026-02-16T22:30:06.867Z"
tags:
  - retrospective
  - process
  - testing
  - debugging
  - project
severity: medium
---

When faced with 6 failing tests sharing a common root cause (positional array structure bug in CLI test patterns), systematic approach worked best:

1. Read test file to understand pattern
2. Use grep to find ALL instances of incorrect pattern
3. Apply bulk fix with replace_all: true for obvious cases
4. Use specific context matching for ambiguous cases
5. Run incremental tests to verify fixes

This reduced 6 failures → 2 → 0 in clear steps, each verifiable. Better than: random try-fix-rerun cycles or attempting all fixes at once.

Applicable to: Any multi-instance code fixes (refactoring, migration, standardisation).
