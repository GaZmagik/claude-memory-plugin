---
id: learning-retro-separate-mock-spec-files-prevent-vitest-global-pollution-cleanly
title: Retro - Separate mock spec files prevent vitest global pollution cleanly
type: learning
scope: project
created: "2026-01-16T20:25:09.682Z"
updated: "2026-01-16T20:25:09.682Z"
tags:
  - retrospective
  - testing
  - vitest
  - pattern
  - project
severity: medium
---

Creating dedicated `-mocks.spec.ts` files with vitest module mocking (vi.spyOn) separate from bun:test integration tests prevented global mock pollution. Pattern: (1) Keep bun:test for integration/filesystem tests in `file.spec.ts`, (2) Create separate `file-mocks.spec.ts` for vitest with module mocking for edge cases requiring dependency injection. This allowed conclude.ts to reach 99.46% coverage by mocking deep dependencies (parseThinkDocument, writeMemory failures) that integration tests couldn't trigger. Eliminates the 'can't mock in bun:test' blocker.
