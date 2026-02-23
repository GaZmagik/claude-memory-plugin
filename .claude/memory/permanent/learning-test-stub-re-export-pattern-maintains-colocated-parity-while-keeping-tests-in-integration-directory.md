---
id: learning-test-stub-re-export-pattern-maintains-colocated-parity-while-keeping-tests-in-integration-directory
title: Test stub re-export pattern maintains colocated parity while keeping tests in integration directory
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T12:30:53.631Z"
updated: "2026-02-23T12:31:03.029Z"
tags:
  - tdd
  - testing
  - colocated-tests
  - test-organization
  - pattern
  - project
---

Some projects use test stub files (e.g., `src/foo/bar.spec.ts` containing only `export * from '../../tests/unit/foo/test-bar.spec.ts'`) to satisfy TDD parity file-level checks whilst keeping actual test implementations in tests/unit/. This hybrid pattern allows flexible test organization (shared test utilities, easier refactoring) whilst maintaining the colocated test file appearance required by parity tools. Works well when integration tests are more comprehensive than unit tests alone.
