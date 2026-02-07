---
id: gotcha-retro-module-level-vimock-creates-unfixable-global-test-pollution
title: Retro - Module-level vi.mock() creates unfixable global test pollution
type: gotcha
scope: project
created: "2026-02-05T11:34:38.768Z"
updated: "2026-02-05T11:34:38.768Z"
tags:
  - retrospective
  - process
  - testing
  - vitest
  - gotcha
  - project
severity: high
---

Module-level vi.mock() in Vitest is hoisted before imports and creates persistent global pollution affecting all subsequent test files. It cannot be undone with vi.restoreAllMocks() or vi.doUnmock().

Symptoms: Tests pass in isolation but fail in full suite with cryptic errors (e.g., undefined fs functions, empty export results).

This session: Found vi.mock('node:fs') in graph.spec.ts and vi.mock('../core/export.js') in boundary.spec.ts. Both caused 22 test failures in copy.spec.ts.

Solution: Never use module-level vi.mock(). Instead:
- Use inline vi.spyOn() within tests
- Let afterEach(() => vi.restoreAllMocks()) clean up
- This requires importing the module first, but ensures proper isolation

Prevention: Grep for 'vi.mock' at module level (not inside describe/it) during code review.
