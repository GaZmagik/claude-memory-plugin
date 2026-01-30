---
id: learning-test-isolation-failures-caused-by-mixed-test-frameworks-bun-test-vitest
title: Test isolation failures caused by mixed test frameworks (Bun test + vitest)
type: learning
scope: project
created: "2026-01-28T22:49:23.586Z"
updated: "2026-01-28T22:49:23.586Z"
tags:
  - testing
  - test-isolation
  - bun-test
  - vitest
  - tech-debt
  - root-cause
  - project
---

The 357 test failures (now 5 after fixes) are NOT caused by mock pollution. Root cause: mixed test frameworks.

Current state:
- 8 test files use Bun test (bun:test imports)
- 2 test files use vitest (vitest imports)
- SessionCache tests (vitest) fail in full suite but pass in isolation

When running `bun test hooks/`, Bun runs both frameworks together, causing test isolation issues. The frameworks have different:
- Test execution models
- Mock systems (vi.mock vs mock.module)
- Cleanup mechanisms
- File system handling

Solution options:
1. Standardize all tests to vitest (aligns with most TypeScript projects)
2. Standardize all tests to Bun test (faster, native to Bun)
3. Split test execution: run vitest and Bun tests separately

Note: Mock pollution audit found ZERO mock cleanup issues. All files with mocks have proper beforeEach/afterEach cleanup. Previous decisions blamed 'vitest mock pollution' incorrectly.
