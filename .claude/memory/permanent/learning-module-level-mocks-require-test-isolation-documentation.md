---
id: learning-module-level-mocks-require-test-isolation-documentation
title: Module-level mocks require test isolation documentation
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-09T10:52:09.400Z"
updated: "2026-02-16T22:30:07.213Z"
tags:
  - testing
  - mocking
  - vitest
  - module-isolation
  - project
---

Tests using module-level vi.mock() calls (gotcha-injector.spec.ts, extract-context.spec.ts, ollama.spec.ts, fork-detection.spec.ts, spawn-session.spec.ts) pollute the global mock registry. These must be documented with '⚠️ TEST ISOLATION REQUIRED' comments explaining why they need separate execution. This prevents future developers from accidentally running them with the standard test suite.
