---
id: gotcha-vimock-importoriginal-parameter-not-fully-supported-in-bun
title: vi.mock() importOriginal parameter not fully supported in Bun
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-26T14:11:36.123Z"
updated: "2026-02-26T14:11:47.091Z"
tags:
  - bun
  - vitest
  - mocking
  - testing
  - project
---

Bun's vi.mock() compatibility shim doesn't support the importOriginal parameter used in vitest. When test files use vi.mock('./module', () => ({ ...importOriginal('./module'), ... })), Bun fails silently. Solution: provide mocks directly without spreading, or move to test:isolated (bunx vitest run) where full vitest is available.
