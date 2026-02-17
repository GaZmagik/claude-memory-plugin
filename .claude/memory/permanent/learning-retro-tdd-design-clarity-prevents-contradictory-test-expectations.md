---
id: learning-retro-tdd-design-clarity-prevents-contradictory-test-expectations
title: Retro - TDD design clarity prevents contradictory test expectations
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-03T19:28:46.757Z"
updated: "2026-02-16T22:30:07.571Z"
tags:
  - retrospective
  - tdd
  - design
  - phase-b
  - project
severity: medium
---

Phase B tests had conflicting expectations (sanitise vs reject same invalid input pattern). Root cause: TDD without upfront design agreement. Both developers wrote tests for the same requirement but different interpretations. Solution: Before Red phase, document API contract (what inputs are valid, what should be sanitised, what rejected). Prevents half the work being rework.
