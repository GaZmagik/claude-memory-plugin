---
id: learning-bun-test-polyfill-vihoisted-requires-bunfigtoml-preload
title: Bun test polyfill vi.hoisted requires bunfig.toml preload
type: learning
scope: project
created: "2026-02-28T03:24:24.937Z"
updated: "2026-02-28T03:24:24.937Z"
tags:
  - bun
  - testing
  - vitest-compat
  - polyfill
  - project
---

vi.hoisted() polyfill is implemented in tests/setup-bun.ts but only loaded when passed via --preload flag. Creating bunfig.toml with [test] preload = ["./tests/setup-bun.ts"] makes polyfill available to all bun test invocations without explicit CLI flags. This enables Vitest-style mocking across entire test suite.
