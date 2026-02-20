---
id: gotcha-bun-test-vi-mocked-incompatibility
title: bun-test-vi-mocked-incompatibility
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-20T22:00:18.597Z"
updated: "2026-02-20T22:00:32.778Z"
tags:
  - testing
  - bun
  - vitest
  - compatibility
  - project
---

Bun's test runner doesn't support vi.mocked() from vitest. Use direct type casting instead: (mock as any) or (prompts.default as any). Affects integration tests using vitest mocks.
