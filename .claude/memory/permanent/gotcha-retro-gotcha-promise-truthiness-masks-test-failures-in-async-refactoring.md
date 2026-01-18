---
id: gotcha-retro-gotcha-promise-truthiness-masks-test-failures-in-async-refactoring
title: "Retro - Gotcha: Promise truthiness masks test failures in async refactoring"
type: gotcha
scope: project
created: "2026-01-18T16:20:31.792Z"
updated: "2026-01-18T16:20:31.792Z"
tags:
  - retrospective
  - process
  - async-refactoring
  - gotcha
  - project
severity: high
---

When refactoring sync to async, missing `await` keywords on conditional checks (e.g., `if (!fileExists(path))`) will silently fail because a Promise is always truthy. Tests pass sync mocks but break with async implementations. Pattern: Always use `!(await promise)` for boolean checks, never bare Promise in conditionals. This was discovered multiple times: checkCrossScopeDuplicate, fileExists checks in read.ts/delete.ts.
