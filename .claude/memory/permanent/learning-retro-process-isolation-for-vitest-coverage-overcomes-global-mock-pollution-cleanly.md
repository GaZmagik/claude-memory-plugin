---
id: learning-retro-process-isolation-for-vitest-coverage-overcomes-global-mock-pollution-cleanly
title: Retro - Process isolation for vitest coverage overcomes global mock pollution cleanly
type: learning
scope: project
created: "2026-01-16T19:39:10.475Z"
updated: "2026-01-16T19:39:10.475Z"
tags:
  - retrospective
  - process
  - testing
  - vitest
  - project
severity: medium
---

Moving test files with vi.mock/mock.module pollution to separate process invocations (via && chains in package.json test:coverage script) solved 355 test failures without refactoring. Demonstrates that process-level isolation is simpler than individual test refactoring when dealing with global state pollution.
