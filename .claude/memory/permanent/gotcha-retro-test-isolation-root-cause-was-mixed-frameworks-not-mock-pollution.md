---
id: gotcha-retro-test-isolation-root-cause-was-mixed-frameworks-not-mock-pollution
title: Retro - Test isolation root cause was mixed frameworks, not mock pollution
type: gotcha
scope: project
created: "2026-01-30T17:23:59.636Z"
updated: "2026-01-30T17:23:59.636Z"
tags:
  - retrospective
  - testing
  - root-cause
  - blame-assumption
  - project
severity: high
---

For 3 versions (v1.1.0, v1.1.1, v1.1.2), we blamed 'vitest mock pollution' for 357 test failures. Decisions made around this false premise:

- decision-defer-test-isolation-fixes-to-v120
- gotcha-test-isolation-vitest-mock-pollution  
- gotcha-retro-test-isolation-failures-pass-individually-but-fail-together-mock-pollution-requires-infrastructure-sprint

Actual root cause (identified in 5 minutes by test-quality-expert agent): 8 test files used Bun test, 2 used vitest. Running `bun test` on both together caused framework interference, not mock pollution.

Solution: Standardize all tests to Bun test (convert 2 vitest files). Result: 357 failures → 5 failures (99.4% pass rate).

Lessons learned:
1. Blame assumptions stick around. Should have forced an audit earlier instead of trusting v1.1.0 blame.
2. Mixed testing frameworks are invisible until you explicitly audit for them.
3. "Works in isolation, fails in suite" is a classic symptom of framework interference, not mock pollution.

Future prevention: Add pre-merge check that all test files use same test framework.
