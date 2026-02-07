---
id: learning-bun-test-mocking-requires-mockmodule-not-viimportactual
title: Bun test mocking requires mock.module() not vi.importActual()
type: learning
scope: project
created: "2026-02-02T22:46:11.114Z"
updated: "2026-02-02T22:46:11.114Z"
tags:
  - bun
  - testing
  - mocking
  - phase-a
  - project
---

Bun's test framework does not support vi.importActual(). Use mock.module() at module level with dynamic imports instead. Critical for mocking modules like git-utils in test suites.
