---
id: learning-tdd-red-phase-confirms-suggest-links-tests-correctly-fail
title: TDD red phase confirms suggest-links tests correctly fail
type: learning
scope: project
created: "2026-02-06T01:30:38.055Z"
updated: "2026-02-06T01:30:38.055Z"
tags:
  - tdd
  - testing
  - suggest-links
  - red-phase
  - project
---

Tests in test-suggest-links-agent.spec.ts correctly fail because cmdSuggestLinks does not support the --agent flag yet. The test expectations are sound - suggestions.length is 0 because the implementation reads from the wrong path when the flag is missing. This validates the TDD red phase is working as intended.
