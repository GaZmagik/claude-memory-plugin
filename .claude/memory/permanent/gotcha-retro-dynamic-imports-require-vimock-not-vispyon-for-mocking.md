---
id: gotcha-retro-dynamic-imports-require-vimock-not-vispyon-for-mocking
title: Retro - Dynamic imports require vi.mock not vi.spyOn for mocking
type: gotcha
scope: project
created: "2026-01-18T22:46:20.041Z"
updated: "2026-01-18T22:46:20.041Z"
tags:
  - retrospective
  - testing
  - vitest
  - test-isolation
  - project
severity: high
---

When code uses dynamic imports like `await import('node:fs')`, static vi.spyOn(fs, 'method') won't intercept the module because it's a different instance. The mermaid test was calling real fs.writeFileSync, corrupting graph.md during test runs. Solution: Use vi.mock('node:fs', ...) at module level with a shared mock function.
