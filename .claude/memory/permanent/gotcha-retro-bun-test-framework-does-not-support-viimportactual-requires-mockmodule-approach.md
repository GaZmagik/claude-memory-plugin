---
id: gotcha-retro-bun-test-framework-does-not-support-viimportactual-requires-mockmodule-approach
title: Retro - Bun test framework does not support vi.importActual, requires mock.module approach
type: gotcha
scope: project
created: "2026-02-02T20:38:39.021Z"
updated: "2026-02-02T20:38:39.021Z"
tags:
  - retrospective
  - testing
  - bun
  - mocking
  - project
severity: high
---

When writing unit tests for Bun projects that need to mock modules, vi.importActual() is not available. Instead use Bun test's mock.module() API with dynamic imports inside tests. Symptom: TypeError: vi.importActual is not a function. Solution: Use mock.module() at module level before test suite, then dynamically import within test functions. This applies to all tests using bun:test framework.
