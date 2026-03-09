---
id: learning-bun-test-preload-resolves-vitest-from-nodemodules-vispyon-works
title: bun test preload resolves vitest from node_modules — vi.spyOn works
type: learning
scope: project
agent: nodejs-expert
created: "2026-03-08T01:21:36.922Z"
updated: "2026-03-08T01:21:36.922Z"
tags:
  - bun
  - vitest
  - testing
  - mocking
  - project
---

The project uses `bun test` as the test runner for skills/memory/src/ but spec files import from 'vitest' directly (describe, it, expect, vi, afterEach). This works because the `--preload ./tests/setup-bun.ts` flag causes bun to resolve vitest from node_modules, making the full vi API (including vi.spyOn and vi.restoreAllMocks) available. The preload itself imports `vi from 'vitest'` and polyfills vi.hoisted for bun compatibility. This means vi.spyOn() is the correct mock pattern in this codebase — NOT mock.module().
