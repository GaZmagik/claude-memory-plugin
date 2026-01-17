---
id: learning-retro-test-driven-spec-updates-ensure-implementation-matches-expectations
title: Retro - Test-driven spec updates ensure implementation matches expectations
type: learning
scope: project
created: "2026-01-17T00:31:55.376Z"
updated: "2026-01-17T00:31:55.376Z"
tags:
  - retrospective
  - process
  - tdd
  - project
severity: medium
---

When mermaid tests failed (edge labels expected abbreviated but got full), updating the tests FIRST to reflect the new spec made it clear what the implementation should do. The tests became specification. Result: All 1835 tests passed after one bug fix (undefined label handling). Lesson: Make tests the source of truth for new behavior.
