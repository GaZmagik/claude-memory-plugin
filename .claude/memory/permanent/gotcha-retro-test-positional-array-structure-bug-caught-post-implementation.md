---
id: gotcha-retro-test-positional-array-structure-bug-caught-post-implementation
title: Retro - Test positional array structure bug caught post-implementation
type: gotcha
scope: project
created: "2026-02-04T13:19:47.608Z"
updated: "2026-02-04T13:19:47.608Z"
tags:
  - retrospective
  - process
  - tdd
  - testing
  - project
severity: high
---

Phase D search-include-shared tests were created with incorrect positional array structure: positional: ['search', 'query'] instead of positional: ['query']. The 'search' command name should have been stripped by the parser before passing to cmdSearch(). This bug passed through initial review (6 failing tests). Should have been caught during Red-Green-Refactor TDD cycle. Prevention: When tests are marked as red-to-green transition, verify test expectations match actual API contract (positional args should NOT include command name when calling command function directly).
