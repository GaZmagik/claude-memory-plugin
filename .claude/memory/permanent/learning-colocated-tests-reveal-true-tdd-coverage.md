---
id: learning-colocated-tests-reveal-true-tdd-coverage
title: Colocated tests reveal true TDD coverage
type: learning
scope: project
created: "2026-01-25T23:22:02.470Z"
updated: "2026-01-25T23:22:02.470Z"
tags:
  - testing
  - tdd-parity
  - v1.1.0
  - project
---

Project structure uses 107 colocated test files (skills/memory/src/xyz.spec.ts) plus 19 in tests/unit/. When configured for colocated tests, achieves 93.4% effective coverage. Tool initially reported 14.6% due to incorrect path mapping. Colocated pattern is more maintainable than test/src separation.
