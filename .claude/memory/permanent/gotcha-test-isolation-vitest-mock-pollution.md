---
id: gotcha-test-isolation-vitest-mock-pollution
title: Test isolation - vitest mock pollution
type: gotcha
scope: project
created: "2026-01-25T23:21:47.403Z"
updated: "2026-01-25T23:21:47.403Z"
tags:
  - testing
  - vitest
  - mocks
  - v1.1.0
  - project
---

357 tests fail in full suite but pass individually. Root cause: shared module state / improperly reset mocks between test files. Colocated tests inherit polluted mock state from previous test files. Requires mock reset audit across 220 test files. Deferred to v1.2.0.
