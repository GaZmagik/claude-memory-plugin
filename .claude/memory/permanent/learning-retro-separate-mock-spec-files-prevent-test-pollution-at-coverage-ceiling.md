---
id: learning-retro-separate-mock-spec-files-prevent-test-pollution-at-coverage-ceiling
title: Retro - Separate mock spec files prevent test pollution at coverage ceiling
type: learning
scope: project
created: "2026-01-16T21:44:17.576Z"
updated: "2026-01-16T21:44:17.576Z"
tags:
  - retrospective
  - testing
  - coverage
  - mocking
  - project
severity: medium
---

When targeting edge cases near 100% coverage (especially error paths like deleteMemory failures, graph load errors), creating separate *-mocks.spec.ts files proved effective. Pattern: mocked collaborators in isolation without polluting other tests. Hit 100% on prune.ts and move.ts in <1 hour by focusing mocks on exact uncovered lines (line numbers from coverage report). Scales better than fixture manipulation.
