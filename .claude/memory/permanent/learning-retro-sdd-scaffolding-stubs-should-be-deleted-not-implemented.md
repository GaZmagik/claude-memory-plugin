---
id: learning-retro-sdd-scaffolding-stubs-should-be-deleted-not-implemented
title: Retro - SDD scaffolding stubs should be deleted, not implemented
type: learning
scope: project
created: "2026-01-26T00:12:01.899Z"
updated: "2026-01-26T00:12:01.899Z"
tags:
  - retrospective
  - process
  - tdd
  - sdd
  - testing
  - project
severity: medium
---

During test quality audit, discovered 10 placeholder test files in tests/unit/think/ with `expect(true).toBe(true)` stubs. Instead of uncommenting assertions and implementing tests, we deleted the files because comprehensive tests already existed colocated in skills/memory/src/think/. Key insight: When SDD generates test scaffolding but real TDD tests are written alongside implementation, evaluate which to keep - don't automatically implement both sets. This prevented 2-3 hours of unnecessary work.
