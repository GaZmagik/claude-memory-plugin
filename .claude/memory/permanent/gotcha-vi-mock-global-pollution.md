---
id: gotcha-vi-mock-global-pollution
title: vi.mock and mock.module cause global test pollution
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-12T04:22:50Z
updated: 2026-01-12T04:22:54Z
tags: ["gotcha","testing","vitest","bun","mocking","high"]
embedding: "47487ac003ab2154fdaebbd71f43455e"
links: ["learning-test-isolation-bun-mock-module"]
---

# vi.mock and mock.module cause global test pollution

**Severity:** High

## Problem

Both vitest `vi.mock()` and bun:test `mock.module()` persist globally across test files when run in the same process. This causes non-deterministic test failures that only appear when tests run together.

## What Does NOT Work

- `vi.restoreAllMocks()` - Only restores spies, NOT module mocks
- `vi.resetModules()` - Actually makes things worse (208 failures vs 173)
- `vi.clearAllMocks()` - Clears call history but not mock implementations
- Running mocked tests last - Pollution still affects subsequent test discovery

## Solution

Run polluting test files in separate process invocations using package.json scripts:

```json
"scripts": {
  "test": "bun run test:clean && bun run test:isolated",
  "test:clean": "bun test <non-polluting-paths>",
  "test:isolated": "bun test file1.spec.ts && bun test file2.spec.ts"
}
```

Each `&&` creates a fresh process with clean module state.

## Identifying Polluting Files

Binary search approach:
1. Run all tests together, note failures
2. Add test files one at a time to isolated runs
3. When failures appear, that file pollutes
4. Check for `vi.mock()` or `mock.module()` calls

## This Project

Four polluting files identified:
- `hooks/src/memory/gotcha-injector.spec.ts` - vi.mock() on list.js, read.js
- `hooks/src/session/extract-context.spec.ts` - vi.mock("fs")
- `hooks/src/session/fork-detection.spec.ts` - mock.module()
- `hooks/src/session/spawn-session.spec.ts` - mock.module()

Result: 1694 tests pass, 0 failures.
