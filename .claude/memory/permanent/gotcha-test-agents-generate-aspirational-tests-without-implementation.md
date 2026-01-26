---
id: gotcha-test-agents-generate-aspirational-tests-without-implementation
title: Test Agents Generate Aspirational Tests Without Implementation
type: gotcha
scope: project
created: "2026-01-26T00:12:17.300Z"
updated: "2026-01-26T00:12:17.300Z"
tags:
  - testing
  - agents
  - test-generation
  - gotcha
  - project
---

When test-quality or test agents generate test files, they may create optimistic tests expecting features that don't exist yet (e.g., cmdThink returning hint field). Review generated tests for false expectations. Skip or mark aspirational tests as `it.skip()` with v1.2.0 deferral comment. Don't merge PRs with failing aspirational tests.
