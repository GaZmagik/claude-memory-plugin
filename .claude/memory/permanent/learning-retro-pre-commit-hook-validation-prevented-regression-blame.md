---
id: learning-retro-pre-commit-hook-validation-prevented-regression-blame
title: Retro - Pre-commit hook validation prevented regression blame
type: learning
scope: project
created: "2026-01-25T21:18:41.471Z"
updated: "2026-01-25T21:18:41.471Z"
tags:
  - retrospective
  - process
  - testing
  - validation
  - hooks
  - project
severity: medium
---

When fixing code issues, immediately running pre-commit hooks (tests) before and after changes using git stash enables quick verification that test failures are pre-existing vs. introduced by the fix. This prevents wasting cycles on false positives and builds confidence that fix commits don't introduce regressions. In this session: verified 361 pre-existing test failures were unrelated to 7 high/medium priority fixes applied.
