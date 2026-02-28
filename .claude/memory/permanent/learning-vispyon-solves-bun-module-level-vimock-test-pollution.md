---
id: learning-vispyon-solves-bun-module-level-vimock-test-pollution
title: vi.spyOn solves Bun module-level vi.mock test pollution
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-28T09:20:15.290Z"
updated: "2026-02-28T09:20:43.246Z"
tags:
  - testing
  - bun
  - vitest
  - mocking
  - vi-spyon
  - module-pollution
  - fs-mocking
  - project
---

When vi.mock('fs'/'node:fs') is at module level in Bun test files, it permanently replaces the module in Bun's shared registry, poisoning co-located test files. mock.restore() in afterAll fails because module evaluation happens before tests run. Solution: (1) Convert SUT to namespace imports (import * as fs), (2) Replace vi.mock() with vi.spyOn(fs, 'functionName') in beforeEach, (3) Call vi.restoreAllMocks() in afterEach. vi.spyOn modifies namespace properties at runtime—not the module registry—so restoration works correctly.
