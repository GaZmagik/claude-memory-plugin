---
id: gotcha-tdd-test-files-must-exist-before-editing-hooks-catches-integration-mismatches
title: TDD test files must exist before editing hooks - catches integration mismatches
type: gotcha
scope: project
created: "2026-01-15T23:04:02.442Z"
updated: "2026-01-15T23:04:02.442Z"
tags:
  - retrospective
  - process
  - tdd
  - hooks
  - project
---

When fixing require-session-restore-approval.ts, the TDD hook required a test file first (.spec.ts). Creating the test file before the fix revealed the exact mismatch: hook expected 'memory-recall' but session-restore-approval was creating 'recall' keys. Without the test-first requirement, this bug would have surfaced only during actual session restore. TDD is especially valuable for hooks (hard to debug, low visibility).
