---
id: gotcha-vimock-state-leaks-across-bun-test-files-without-proper-restoration
title: vi.mock() state leaks across Bun test files without proper restoration
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-28T03:28:42.825Z"
updated: "2026-02-28T09:20:43.357Z"
tags:
  - bun
  - testing
  - mocks
  - test-isolation
  - lifecycle
  - project
---

vi.mock() in fork-detection.spec.ts created fs mocks persisting into session-cache.spec.ts, causing test failures. mock.restore() in Bun's vi compatibility doesn't fully undo vi.mock() like Vitest. Workaround: Import real modules first, use vi.hoisted() to override only specific functions, ensure cleanup via afterAll(mock.restore(), vi.restoreAllMocks()). Alternative: Use mock.module() with proper scoping.
