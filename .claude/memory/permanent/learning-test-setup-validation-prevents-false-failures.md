---
id: learning-test-setup-validation-prevents-false-failures
title: Test setup validation prevents false failures
type: learning
scope: project
created: "2026-01-15T18:02:39.051Z"
updated: "2026-01-15T18:02:39.051Z"
tags:
  - retrospective
  - testing
  - workflows
  - high
  - project
---

Ran 'bun test hooks/' which tries to run vitest files with bun runner - tests appeared to fail. Real test suite runs fine with 'bun run test' (proper setup in package.json with separate vitest/bun commands).

Lesson: Always verify test command matches framework setup before debugging failures. The failure was operator error (wrong invocation), not code issues. Saved significant debugging time when all 2,487 tests were actually passing.
