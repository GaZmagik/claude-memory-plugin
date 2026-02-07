---
id: learning-bun-test-framework-requires-comprehensive-fs-mocking-for-isolation
title: Bun test framework requires comprehensive fs mocking for isolation
type: learning
scope: project
created: "2026-02-03T19:29:41.268Z"
updated: "2026-02-03T19:29:41.268Z"
tags:
  - bun
  - testing
  - file-system
  - mocking
  - phase-b
  - project
---

Tests that interact with file operations (writeFileAtomic, fileExists, ensureDir) must mock fsp.access, fsp.writeFile, and fsp.rename at the test level. Without comprehensive mocking, tests fail with permission errors when attempting real directory creation. Bun's vi.mock() doesn't auto-mock fs modules - explicit spyOn() calls are required.
