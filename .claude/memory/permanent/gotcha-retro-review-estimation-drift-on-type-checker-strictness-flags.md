---
id: gotcha-retro-review-estimation-drift-on-type-checker-strictness-flags
title: Retro - Review estimation drift on type checker strictness flags
type: gotcha
scope: project
created: "2026-01-18T13:56:10.029Z"
updated: "2026-01-18T13:56:10.029Z"
tags:
  - retrospective
  - estimation
  - typescript
  - project
severity: high
---

Adding noUncheckedIndexedAccess to tsconfig surfaced 313 TS errors (actual: 4-8h, estimated: 0.25h). Root cause: didn't pre-check impact before committing. Solution: Always run 'tsc --flag-to-test' in isolation before enabling in tsconfig.json. Can preview error count before deciding to defer.
