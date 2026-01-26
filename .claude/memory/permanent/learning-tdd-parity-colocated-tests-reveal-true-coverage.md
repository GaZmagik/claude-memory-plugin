---
id: learning-tdd-parity-colocated-tests-reveal-true-coverage
title: TDD parity - colocated tests reveal true coverage
type: learning
scope: project
created: "2026-01-25T23:21:58.639Z"
updated: "2026-01-25T23:21:58.639Z"
tags:
  - testing
  - tdd-parity
  - colocated-tests
  - v1.1.0
  - project
---

Project has 107 colocated test files (alongside source in skills/memory/src/) plus 19 in tests/unit/. TDD parity tool initially reported 14.6% coverage but reveals 93.4% effective coverage when configured for colocated structure. Colocated tests (xyz.spec.ts in same directory) are more discoverable than conventional test/src separation.
