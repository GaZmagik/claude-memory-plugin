---
id: gotcha-tests-with-dynamic-imports-need-vimock-not-vispyon
title: Tests with dynamic imports need vi.mock not vi.spyOn
type: gotcha
scope: project
created: "2026-01-18T19:42:06.114Z"
updated: "2026-01-18T19:42:06.114Z"
tags:
  - testing
  - vitest
  - dynamic-import
  - mocking
  - project
severity: high
---

When code uses dynamic imports like `await import('node:fs')`, static `vi.spyOn(fs, 'method')` won't work because it's a different module instance. Use `vi.mock('node:fs', () => ({ ... }))` at module level instead.

Example of the bug: cmdMermaid test didn't mock fs.writeFileSync properly, causing it to write empty graph.md to the real project directory during test runs.

Fix: Use vi.mock with a module-level mock function that can be referenced in tests.
