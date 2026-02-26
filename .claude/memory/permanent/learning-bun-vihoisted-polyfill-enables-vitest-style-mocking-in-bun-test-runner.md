---
id: learning-bun-vihoisted-polyfill-enables-vitest-style-mocking-in-bun-test-runner
title: Bun vi.hoisted polyfill enables vitest-style mocking in bun test runner
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-25T23:39:33.994Z"
updated: "2026-02-26T14:11:47.342Z"
tags:
  - bun
  - vitest
  - testing
  - mocking
  - project
---

Bun's vitest compat shim lacks vi.hoisted(). Polyfill with (vi as any).hoisted = (fn) => fn() in a --preload script. Works because Bun does not hoist vi.mock() calls, so the callback executes in-place before vi.mock runs. Note: Bun also lacks importOriginal in vi.mock factories — provide mock exports directly without spreading the original module.
