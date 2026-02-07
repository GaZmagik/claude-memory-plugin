---
id: learning-phase-f-test-suite-cleanup-22-failures-reduced-to-0-by-fixing-module-level-mocks
title: "Phase F test suite cleanup: 22 failures reduced to 0 by fixing module-level mocks"
type: learning
scope: project
created: "2026-02-05T11:35:25.953Z"
updated: "2026-02-05T11:35:25.953Z"
tags:
  - testing
  - phase-f
  - test-pollution
  - ci-cd
  - project
---

Full test suite had 22 failures when run together but 0 failures when tests ran in isolation. Root cause: two module-level vi.mock() calls in boundary.spec.ts and graph.spec.ts. Replacing with inline vi.spyOn() and proper afterEach cleanup fixed all 20 copyAgent test failures. Final count: 2,380 tests pass, 0 fail.
