---
id: gotcha-vi-hoisted-bun-incompatibility
title: vi.hoisted() not supported in Bun test runner
type: gotcha
scope: project
created: "2026-03-01T15:18:23.829Z"
updated: "2026-03-01T15:18:23.829Z"
tags:
  - bun
  - testing
  - mocking
  - vitest
  - project
---

Buns vitest compatibility doesnt support vi.hoisted() for mocking factory functions. Found in spawn-session.spec.ts, fork-detection.spec.ts, resolve-base-path.spec.ts. Use vi.mock() directly instead, calling the mock factory inline without hoisting. Replace vi.hoisted(() => ({ mock })) patterns with direct vi.mock() + vi.fn() calls.
