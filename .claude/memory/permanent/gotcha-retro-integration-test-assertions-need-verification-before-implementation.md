---
id: gotcha-retro-integration-test-assertions-need-verification-before-implementation
title: Gotcha retro - Integration test assertions need verification before implementation
type: gotcha
scope: project
created: "2026-01-25T12:22:43.991Z"
updated: "2026-01-25T12:22:43.991Z"
tags:
  - retrospective
  - process
  - tdd
  - testing
  - testing-patterns
  - project
severity: medium
---

Two integration tests failed during first run: (1) string length calculation (150 + ' text' = 188, not >200), (2) hint count expectation (6 hints, not 5). Both were test bugs, not code bugs. Prevention: during TDD Red phase, manually trace through one test example to verify assertion logic is correct before declaring 'all tests fail'.
