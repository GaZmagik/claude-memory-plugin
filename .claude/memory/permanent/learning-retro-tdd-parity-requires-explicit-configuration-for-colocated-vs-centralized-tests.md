---
id: learning-retro-tdd-parity-requires-explicit-configuration-for-colocated-vs-centralized-tests
title: Retro - TDD parity requires explicit configuration for colocated vs centralized tests
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-25T23:21:42.451Z"
updated: "2026-02-01T22:38:06.550Z"
tags:
  - retrospective
  - process
  - testing
  - tdd
  - project
severity: medium
---

Project had 107 colocated .spec.ts files alongside source, but initial TDD parity check looked in tests/unit/ (19 files) and reported 0% coverage. Rerunning with --tests pointing to src/ revealed 91% actual coverage. Insight: Tools should detect test location patterns automatically or provide clear guidance. This prevented false alarm about coverage gaps.
