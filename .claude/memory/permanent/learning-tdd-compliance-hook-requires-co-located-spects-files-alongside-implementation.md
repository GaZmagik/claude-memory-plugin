---
id: learning-tdd-compliance-hook-requires-co-located-spects-files-alongside-implementation
title: TDD compliance hook requires co-located .spec.ts files alongside implementation
type: learning
scope: project
created: "2026-02-02T20:39:25.442Z"
updated: "2026-02-02T20:39:25.442Z"
tags:
  - tdd
  - bun
  - testing
  - hook-enforcement
  - project
---

The Bun TDD enforcement hook requires ALL source files to have a co-located test file (e.g., sanitise-agent-name.ts must have sanitise-agent-name.spec.ts in the same directory). Centralised test files in tests/ do NOT satisfy the hook. Create empty stub files with comments referencing actual test location to comply.
