---
id: learning-retro-coverage-asymptotic-returns-hit-practical-ceiling-around-99
title: Retro - Coverage asymptotic returns hit practical ceiling around 99%
type: learning
scope: project
created: "2026-01-16T20:48:59.466Z"
updated: "2026-01-16T20:48:59.466Z"
tags:
  - retrospective
  - testing
  - coverage
  - diminishing-returns
  - project
severity: low
---

Pushing from 99% to 100% requires disproportionate effort. Most files achieved 99-99.8% coverage after adding dedicated mock tests for error paths. The remaining 0.2-1% typically requires: extremely specific edge cases, untestable paths (unreachable code), or whitespace/imports. Strategy: accept 99% as practical ceiling unless edge case is genuinely important. This session improved 7 files from 89-94% to 98-100%, but most valuable work happened in 89-95% range.
