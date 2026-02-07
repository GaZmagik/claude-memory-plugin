---
id: gotcha-getflagbool-returns-false-not-undefined-for-missing-flags
title: getFlagBool returns false not undefined for missing flags
type: gotcha
scope: project
created: "2026-02-06T01:10:22.209Z"
updated: "2026-02-06T01:10:22.209Z"
tags:
  - flags
  - cli
  - defaults
  - project
---

getFlagBool(flags, key) returns boolean (false when key missing), not undefined. This breaks nullish coalescing: getFlagBool(...) ?? true evaluates to false ?? true = false. Solution: check for explicit flag values instead of using getFlagBool for true-default flags.
