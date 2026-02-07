---
id: gotcha-empty-test-files-created-by-hooks-provide-false-coverage-assurance
title: Empty test files created by hooks provide false coverage assurance
type: gotcha
scope: project
created: "2026-02-06T23:49:16.448Z"
updated: "2026-02-06T23:49:16.448Z"
tags:
  - tdd
  - testing
  - hooks
  - code-quality
  - project
---

TDD hooks auto-created 5 empty .spec.ts files to satisfy "test files must exist" requirements, but they contained 0 bytes of code. This created false confidence—the test quality agent flagged them as untested. Always validate test file content, not just existence.
