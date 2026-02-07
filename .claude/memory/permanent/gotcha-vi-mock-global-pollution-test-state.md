---
id: gotcha-vi-mock-global-pollution-test-state
title: vi.mock() persists globally across test files causing test pollution
type: gotcha
scope: project
created: "2026-02-07T15:36:25.724Z"
updated: "2026-02-07T15:36:25.724Z"
tags:
  - testing
  - vitest
  - mocks
  - global-state
  - test-pollution
  - project
---

When using vi.mock() in one spec file, mocks persist globally across all test files in the suite. Example: test-mermaid-agent-shared.spec.ts did process.chdir(testDir) without restoration in afterEach, which polluted helpers.spec.ts when the temp directory was deleted before helpers.spec.ts could restore its original cwd. Solution: Always restore global state (process.cwd, env vars, module mocks) in afterEach hooks.
