---
id: gotcha-vitest-include-patterns-dont-cover-skillstests-subdirectories
title: Gotcha - Vitest include patterns don't cover skills/*/tests/ subdirectories
type: gotcha
scope: project
created: "2026-02-05T23:48:14.605Z"
updated: "2026-02-05T23:48:14.605Z"
tags:
  - retrospective
  - process
  - test-infrastructure
  - phase-e
  - project
severity: high
---

Phase E integration tests live in skills/memory/tests/integration/ but root vitest.config.ts has include: ['tests/integration/**/*.spec.ts'] (root level only). This caused test discovery to fail and required using `bun test` directly as a workaround. Fix: Update include pattern to ['tests/integration/**/*.spec.ts', 'skills/**/tests/**/*.spec.ts'] to cover both root and skills-scoped test directories. This affects any future skills with integration tests.
