---
id: gotcha-gotcha-mock-test-refactoring-needs-dedicated-sprint-not-incremental
title: Gotcha - Mock test refactoring needs dedicated sprint, not incremental
type: gotcha
scope: project
created: "2026-01-17T23:06:47.911Z"
updated: "2026-01-18T00:08:06.987Z"
tags:
  - retrospective
  - testing
  - technical-debt
  - project
severity: high
---

Started reducing vi.spyOn mocks in skills/memory/ (114 in write.spec.ts alone). Initial work on validation mocks went smooth. Problem: 42+ other test files use heavy mocking, and each requires context-specific decisions (which dependencies are I/O vs pure, whether to use temp dirs vs mocks). Estimated 1-2 days of work. Lesson: Test refactoring at this scale needs a dedicated sprint with clear stopping criteria, not incremental 'while we're here' work. Risk: leaving it half-done creates technical debt.
