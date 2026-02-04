---
id: learning-retro-coverage-validation-should-be-explicit-not-assumed
title: Retro - Coverage validation should be explicit, not assumed
type: learning
scope: project
created: "2026-02-03T22:32:20.326Z"
updated: "2026-02-03T22:32:20.326Z"
tags:
  - retrospective
  - process
  - testing
  - quality
  - project
severity: medium
---

Phase C required 100% test coverage but we declared success based on 'tests pass + no compilation errors'. Better approach: Run actual coverage tooling (nyc/c8) and capture coverage reports as artifacts. For phase D onwards: add explicit 'coverage > 90%' gate in test verification step, not just 'tests pass'. Test existence ≠ coverage completeness.
