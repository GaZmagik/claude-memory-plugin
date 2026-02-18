---
id: learning-retro-tdd-first-with-explicit-test-sections-t001t028-accelerated-phase-delivery
title: Retro - TDD-first with explicit test sections (T001–T028) accelerated phase delivery
type: learning
scope: project
created: "2026-02-18T15:50:19.965Z"
updated: "2026-02-18T15:50:19.965Z"
tags:
  - retrospective
  - process
  - tdd
  - speckit
  - v1.5.0
  - project
severity: medium
---

Writing all failing tests before implementation proved highly effective for v1.5.0 Phase A & B. Explicit test numbering (T001–T007 for Phase A, T013–T022a for Phase B) provided clear progress tracking, prevented scope creep, and caught type errors early. The 'red → green' cycle was unambiguous. Recommended pattern for future multi-phase specs: number all tests upfront, write them first, verify red state, then implement. This is faster than incremental test writing.
