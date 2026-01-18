---
id: gotcha-gotcha-vimock-causes-test-pollution-in-coverage-mode
title: Gotcha - vi.mock() causes test pollution in coverage mode
type: gotcha
scope: project
created: "2026-01-16T18:31:40.641Z"
updated: "2026-01-16T18:31:40.641Z"
tags:
  - retrospective
  - testing
  - technical-debt
  - project
severity: high
---

Running full coverage with bun test --coverage hits vi.mock() pollution: 355 failures when all tests run together, but 2794 pass with process isolation (bun run test script). Root cause: vi.mock() is global state that persists across test files. Solution: Migrate 4 polluting files (ollama.spec.ts, extract-context.spec.ts, gotcha-injector.spec.ts, think-lifecycle.spec.ts) from vi.mock() to mock.module() for better isolation. Running coverage on subsets works fine (503 tests, 0 failures in skills/memory/src).
