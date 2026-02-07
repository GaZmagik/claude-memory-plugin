---
id: learning-retro-sdd-scaffolding-stubs-should-be-deleted-not-implemented
title: Retro - SDD scaffolding stubs should be deleted, not implemented
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-26T00:12:01.899Z"
updated: "2026-02-01T22:38:06.938Z"
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
