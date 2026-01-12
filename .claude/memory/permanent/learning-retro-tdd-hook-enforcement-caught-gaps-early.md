---
id: learning-retro-tdd-hook-enforcement-caught-gaps-early
title: "Retro: TDD hook enforcement caught gaps early"
type: learning
scope: project
created: "2026-01-12T22:43:09.650Z"
updated: "2026-01-12T22:43:09.650Z"
tags:
  - retrospective
  - process
  - tdd
  - project
---

When implementing prune.ts modifications, the TDD hook blocked edits to source until prune.spec.ts existed.

Outcome: Creating a test stub first (rather than writing implementation then tests) surfaced:
- What the function signature should be
- What failure modes needed coverage
- What success cases mattered

Tests went from afterthought (batch at end) to specification (written first). The stub I created became nearly the final test suite.

This is the TDD cycle working as designed: tests shape implementation. The hook is properly invasive.
