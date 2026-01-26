---
id: learning-duplicate-sdd-scaffolding-bloats-test-suite
title: Duplicate SDD Scaffolding Bloats Test Suite
type: learning
scope: project
created: "2026-01-26T00:12:01.508Z"
updated: "2026-01-26T00:12:01.508Z"
tags:
  - testing
  - sdd
  - test-organization
  - project
---

When using SDD .specify/specs/ templates, test stubs are generated in tests/unit/ but real tests are colocated with implementations (src/*.spec.ts). This creates duplicate test files that are never completed. Solution: Delete old SDD stub files after colocated tests are written.
