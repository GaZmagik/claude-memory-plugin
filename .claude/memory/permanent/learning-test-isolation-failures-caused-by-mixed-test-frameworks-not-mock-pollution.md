---
id: learning-test-isolation-failures-caused-by-mixed-test-frameworks-not-mock-pollution
title: Test isolation failures caused by mixed test frameworks, not mock pollution
type: learning
scope: project
created: "2026-01-30T17:24:11.036Z"
updated: "2026-01-30T17:24:11.036Z"
tags:
  - testing
  - gotcha-correction
  - test-frameworks
  - bun
  - vitest
  - project
---

Initial hypothesis blamed 357 test failures on 'vitest mock pollution'. Investigation revealed actual cause: 8 files using Bun test, 2 files using vitest. When run together, frameworks interfere. Standardizing all tests to Bun test reduced failures from 357 to 5 (99.4% success). All 4 files with mocks have exemplary cleanup. Root cause was test framework incompatibility, not mock state leakage.
