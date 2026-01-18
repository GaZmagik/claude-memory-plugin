---
id: learning-retro-type-safe-branded-id-refactor-phase-stratification-was-key
title: "Retro - Type-safe branded ID refactor: phase stratification was key"
type: learning
scope: project
created: "2026-01-18T04:25:14.672Z"
updated: "2026-01-18T04:25:14.672Z"
tags:
  - retrospective
  - process
  - typescript
  - refactoring
  - project
severity: high
---

When migrating plain strings to branded types across a large codebase (201+ type errors), stratifying the fix into phases prevents compounding errors: (1) Create branded types + guards, (2) Update core type definitions, (3) Fix implementation files first (20 errors), (4) Build test helpers before fixing tests (187 errors). This top-down approach lets helper modules abstract boilerplate and prevents test scaffolding from blocking impl validation.
