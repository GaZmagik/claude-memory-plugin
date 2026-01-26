---
id: learning-tdd-hook-enforcement-requires-co-located-test-files
title: TDD Hook Enforcement requires co-located test files
type: learning
scope: project
created: "2026-01-25T16:26:47.999Z"
updated: "2026-01-25T16:26:47.999Z"
tags:
  - tdd
  - hooks
  - typescript
  - testing
  - project
---

The TDD hook (tdd-typescript.ts) requires co-located .spec.ts files for all implementations. Use 'bash touch' to create stubs first, then read + write implementations. This prevents Write tool errors on empty files.
