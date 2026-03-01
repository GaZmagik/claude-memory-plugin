---
id: gotcha-retro-test-mock-pollution-from-vimock-leaks-across-files-in-bun-when-polyfill-enabled
title: Retro - Test mock pollution from vi.mock() leaks across files in Bun when polyfill enabled
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-28T03:22:15.232Z"
updated: "2026-02-28T09:20:43.283Z"
tags:
  - retrospective
  - process
  - testing
  - bun
  - project
severity: high
---

When bunfig.toml preloads setup-bun.ts to enable vi.hoisted() polyfill, vi.mock() calls in test files (e.g., fork-detection.spec.ts mocking node:fs) leak mocks into sibling test files. mock.restore() doesn't fully clear vitest-style mocks in Bun. Mitigation: use explicit afterAll(() => mock.module(...)) to re-import fresh modules, or isolate integration test files from unit tests.
