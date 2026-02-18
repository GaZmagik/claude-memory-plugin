---
id: gotcha-retro-test-fixture-design-requires-alignment-with-scoring-logic-intent-before-implementation
title: Retro - Test fixture design requires alignment with scoring logic intent before implementation
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-18T16:16:17.533Z"
updated: "2026-02-18T17:12:05.851Z"
tags:
  - retrospective
  - process
  - testing
  - fixtures
  - project
severity: high
---

Tests written with 'ideal' memory placement scenarios didn't initially match the scoring functions' actual intent. Created fixtures using well-placed memories (high scores) when tests expected misplaced ones (low scores for auto-move logic). Fixture review before implementation caught this, but required rework of 4 test cases (T038, T039, T040, T042a). Pattern: Document 'what score should this memory get and WHY' in fixture setup comments before writing assertions. This prevents aspirational-vs-actual misalignment.
