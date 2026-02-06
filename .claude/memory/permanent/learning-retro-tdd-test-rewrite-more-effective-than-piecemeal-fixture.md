---
id: learning-retro-tdd-test-rewrite-more-effective-than-piecemeal-fixture
title: Retro - TDD test rewrite more effective than piecemeal fixture
type: learning
scope: project
created: "2026-02-06T01:20:24.046Z"
updated: "2026-02-06T01:20:24.046Z"
tags:
  - retrospective
  - process
  - tdd
  - testing
  - project
severity: medium
---

When an aspirational test file diverges too far from actual implementation (wrong imports, non-existent features, mismatched response shapes), a complete rewrite against the real code is faster than fixture-by-fixture repair. The test-suggest-links-agent.spec.ts rewrite took one session and is now aligned with actual SuggestLinksResponse shape and CLI interface. Lesson: detect aspirational tests early and rewrite, don't patch.
