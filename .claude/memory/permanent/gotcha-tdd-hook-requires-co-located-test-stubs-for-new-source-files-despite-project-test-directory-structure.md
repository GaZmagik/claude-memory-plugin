---
id: gotcha-tdd-hook-requires-co-located-test-stubs-for-new-source-files-despite-project-test-directory-structure
title: TDD hook requires co-located test stubs for new source files despite project test directory structure
type: gotcha
scope: project
created: "2026-02-05T15:10:50.644Z"
updated: "2026-02-05T15:10:50.644Z"
tags:
  - phase-e
  - tdd
  - test-structure
  - hooks
  - project
severity: medium
---

Phase E implementation blocked by TDD PreToolUse hook expecting test files co-located with source (src/display/format-scope-indicator.spec.ts) despite project convention of tests in tests/unit/display/. Workaround: Create stub test files alongside source then update .tddignore, or create symlink stubs in source directory.
