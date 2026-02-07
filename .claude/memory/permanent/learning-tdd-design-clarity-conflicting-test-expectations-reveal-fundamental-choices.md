---
id: learning-tdd-design-clarity-conflicting-test-expectations-reveal-fundamental-choices
title: TDD design clarity - conflicting test expectations reveal fundamental choices
type: learning
scope: project
created: "2026-02-03T19:29:50.740Z"
updated: "2026-02-03T19:29:50.740Z"
tags:
  - tdd
  - design
  - testing
  - agent-validation
  - phase-b
  - project
---

When tests expect conflicting behaviors (e.g., 'sanitise uppercase agent names' vs 'reject uppercase agent names'), it signals unclear design. The solution: decide the API contract first (should users provide pre-sanitised input or should the API auto-sanitise?), then write consistent tests. In this case: always sanitise first, then validate the sanitised result.
