---
id: gotcha-retro-duplicate-mock-setup-creates-test-fragility
title: Retro - Duplicate mock setup creates test fragility
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-03T19:28:56.762Z"
updated: "2026-02-16T22:30:07.573Z"
tags:
  - retrospective
  - testing
  - mocking
  - phase-b
  - project
severity: high
---

File system mocks (ensureDir, access, writeFile, rename) were added individually to each test file's beforeEach. This caused: (1) inconsistent mock behavior across files (some forgot access mock), (2) repeated code, (3) hard to maintain when mock requirements change. Lesson: Create a shared mock factory or use a test helper module. For Phase C, consolidate fs-utils mocks into a beforeEach at the suite level or a reusable setupFsMocks() function.
