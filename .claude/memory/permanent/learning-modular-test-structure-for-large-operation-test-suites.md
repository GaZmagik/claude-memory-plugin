---
id: learning-modular-test-structure-for-large-operation-test-suites
title: Modular test structure for large operation test suites
type: learning
scope: project
created: "2026-02-04T19:58:10.140Z"
updated: "2026-02-04T19:58:10.140Z"
tags:
  - testing
  - architecture
  - tdd
  - agent-operations
  - project
---

When test files exceed 1,000 lines, split into modular files per operation (create.spec.ts, delete.spec.ts, etc) rather than monolithic suite. Improves maintainability and respects TDD hook constraints.
