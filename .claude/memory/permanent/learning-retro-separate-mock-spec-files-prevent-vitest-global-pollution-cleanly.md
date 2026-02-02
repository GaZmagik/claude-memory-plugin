---
id: learning-retro-separate-mock-spec-files-prevent-vitest-global-pollution-cleanly
title: Retro - Separate mock spec files prevent vitest global pollution cleanly
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-16T20:48:50.183Z"
updated: "2026-02-01T22:38:06.603Z"
tags:
  - retrospective
  - testing
  - coverage
  - vitest
  - project
severity: medium
---

When testing error paths in vitest that require mocking modules (fs, index, frontmatter), creating separate `*-mocks.spec.ts` files prevents vi.mock() global pollution that breaks coverage reporting. The pattern: one integration-style test file per module + one `*-mocks.spec.ts` file containing only mocked edge cases. This isolation keeps coverage reports accurate and tests fast.
