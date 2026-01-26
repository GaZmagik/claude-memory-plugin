---
id: decision-defer-test-isolation-fixes-to-v120
title: Defer test isolation fixes to v1.2.0
type: decision
scope: project
created: "2026-01-25T23:11:30.939Z"
updated: "2026-01-25T23:11:30.939Z"
tags:
  - v1.1.0
  - testing
  - tech-debt
  - project
---

357 test failures are mock pollution issues - tests pass individually but fail in full suite. Root cause: shared module state, improperly reset mocks across 220 test files. Decision: Ship v1.1.0 with known test isolation debt, dedicate v1.2.0 sprint to test infrastructure cleanup.
