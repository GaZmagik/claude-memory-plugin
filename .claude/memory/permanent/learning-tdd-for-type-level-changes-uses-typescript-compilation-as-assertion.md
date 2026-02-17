---
id: learning-tdd-for-type-level-changes-uses-typescript-compilation-as-assertion
title: TDD for type-level changes uses TypeScript compilation as assertion
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T08:02:48.717Z"
updated: "2026-02-16T22:30:07.437Z"
tags:
  - tdd
  - typescript
  - type-system
  - testing-patterns
  - project
---

When adding optional fields to TypeScript interfaces (e.g., agent_context on HookInput), write tests that construct the type and serialize to JSON. Tests pass at runtime (vitest strips types) but TypeScript compiler flags 10+ type errors (Red phase). Add field to interface to turn Red->Green. This pattern validates type-level changes propagate through JSON serialisation boundaries.
