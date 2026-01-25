---
id: gotcha-retro-test-isolation-failures-pass-individually-but-fail-together-mock-pollution-requires-infrastructure-sprint
title: Retro - Test isolation failures pass individually but fail together (mock pollution) requires infrastructure sprint
type: gotcha
scope: project
created: "2026-01-25T23:21:47.052Z"
updated: "2026-01-25T23:21:47.052Z"
tags:
  - retrospective
  - process
  - testing
  - tech-debt
  - project
severity: high
---

357 test failures only appear when running full suite (bun test). Individual test files pass perfectly (bun test file.spec.ts). Root cause: shared module state and improperly reset mocks across 220 test files. Solution: Not worth fixing incrementally - requires dedicated infrastructure sprint (v1.2.0 deferred). Key learning: Before dismissing test failures, verify if they're isolation issues vs real bugs.
