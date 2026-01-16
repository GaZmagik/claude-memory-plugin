---
id: gotcha-retro-spec-review-discovered-59-typescript-compilation-errors-at-end-of-phase
title: Retro - Spec review discovered 59 TypeScript compilation errors at end-of-phase
type: gotcha
scope: project
created: "2026-01-16T17:46:04.250Z"
updated: "2026-01-16T17:46:04.250Z"
tags:
  - retrospective
  - process
  - testing
  - compilation
  - project
severity: high
---

Running /speckit-review at phase end (not mid-phase) discovered 59 TypeScript compilation errors, 25+ critical issues (memory leaks, race conditions, security), and 15 documentation problems late in the cycle. Pattern: Comprehensive expert review should run at phase midpoint (after 50% completion) to catch architectural issues early rather than at end when fixing requires major refactoring.
