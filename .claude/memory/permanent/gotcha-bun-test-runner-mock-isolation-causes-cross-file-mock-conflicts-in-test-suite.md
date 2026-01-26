---
id: gotcha-bun-test-runner-mock-isolation-causes-cross-file-mock-conflicts-in-test-suite
title: Gotcha - Bun test runner mock isolation causes cross-file mock conflicts in test suite
type: gotcha
scope: project
created: "2026-01-26T16:42:06.965Z"
updated: "2026-01-26T16:42:06.965Z"
tags:
  - retrospective
  - testing
  - bun
  - gotcha
  - project
severity: medium
---

When using bun:test with vi.mock() across multiple test files that import the same module, mock state can leak between files. Running tests individually passes (12 pass), but running full suite fails (1 error). Workaround: Run spec files individually during CI, or use separate test processes. This is a bun/vitest integration issue, not code issue.
