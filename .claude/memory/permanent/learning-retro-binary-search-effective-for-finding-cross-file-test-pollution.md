---
id: learning-retro-binary-search-effective-for-finding-cross-file-test-pollution
title: Retro - Binary search effective for finding cross-file test pollution
type: learning
scope: project
created: "2026-02-05T11:34:30.142Z"
updated: "2026-02-05T11:34:30.142Z"
tags:
  - retrospective
  - process
  - testing
  - debugging
  - project
severity: medium
---

When debugging test failures that pass in isolation but fail in full suite, binary search through test file execution is highly effective. Systematically run first half vs second half of tests to narrow down the pollution source.

This session: 26 CLI test files → 13 → 6 → 3 → identified graph.spec.ts fs mock in ~4 iterations.

Key: Each iteration cuts search space in half. Combined with inline error checking (grep for vi.mock at module level), the pollution source was identified in under 30 minutes.
