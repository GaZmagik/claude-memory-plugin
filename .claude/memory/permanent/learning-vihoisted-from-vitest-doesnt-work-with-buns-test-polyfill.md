---
id: learning-vihoisted-from-vitest-doesnt-work-with-buns-test-polyfill
title: vi.hoisted() from vitest doesn't work with Bun's test polyfill
type: learning
scope: project
project: claude-memory-plugin
created: "2026-03-07T18:30:36.624Z"
updated: "2026-03-07T18:30:52.291Z"
tags:
  - bun
  - vitest
  - testing
  - compatibility
  - project
---

Bun's vitest polyfill doesn't support vi.hoisted() for module-level mock declarations. Instead, use top-level variable declarations (e.g., `const mockFn = vi.fn()`) which Bun naturally hoists. Applied fix: replaced vi.hoisted() pattern in 5 spec files with top-level declarations.
