---
id: learning-co-located-comprehensive-test-files-replace-individual-unit-tests-for-entire-phase
title: Co-located comprehensive test files replace individual unit tests for entire phase
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-20T06:47:32.187Z"
updated: "2026-02-20T06:47:53.634Z"
tags:
  - TDD
  - co-located-tests
  - integration
  - phase-2b
  - test-organization
  - project
---

Phase 2B replaced 28 planned individual unit tests (T033-T060) with 4 comprehensive co-located spec files covering all functionality at once. This approach is more maintainable and catches integration issues earlier than isolated unit tests. Fixed 12 test failures by removing unnecessary process.chdir() calls and properly reloading graph state.
