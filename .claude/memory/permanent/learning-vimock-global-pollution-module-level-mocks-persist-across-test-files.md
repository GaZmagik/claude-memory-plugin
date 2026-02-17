---
id: learning-vimock-global-pollution-module-level-mocks-persist-across-test-files
title: vi.mock() global pollution - module-level mocks persist across test files
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-05T11:35:04.183Z"
updated: "2026-02-16T22:30:07.227Z"
tags:
  - testing
  - vitest
  - gotcha
  - test-pollution
  - project
---

Module-level vi.mock() calls are hoisted and persist globally across all test files. Removing two global mocks (fs and export modules) fixed 20 test failures. Use inline vi.spyOn() with afterEach cleanup instead of module-level vi.mock().
