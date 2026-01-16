---
id: learning-retro-function-coverage-line-coverage-branch-testing-matters
title: Retro - Function coverage ≠ line coverage; branch testing matters
type: learning
scope: project
created: "2026-01-16T21:10:19.692Z"
updated: "2026-01-16T21:10:19.692Z"
tags:
  - retrospective
  - testing
  - coverage
  - metrics
  - project
severity: medium
---

Clarified distinction during session: Function coverage (% Funcs) = did we call this function at all; Line coverage (% Lines) = did we execute every statement/branch. Example: write.ts shows 86.67% func coverage but 99.57% line coverage - most functions execute but some branches (like Enterprise/Global scope tags) weren't initially tested. Adding scope-specific tests fixed this. Call-counting mock pattern useful for testing same function with different return values across invocation sequence (TOCTOU scenarios in promote.ts race conditions). Key: High line coverage is harder than high function coverage because you must test every conditional branch.
