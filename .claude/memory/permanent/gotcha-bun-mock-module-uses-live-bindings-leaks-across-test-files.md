---
id: gotcha-bun-mock-module-uses-live-bindings-leaks-across-test-files
title: "Gotcha: bun:test mock.module uses live bindings that leak across test files in same process"
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-22T23:23:06.819Z"
updated: "2026-02-23T06:32:34.984Z"
tags:
  - testing
  - bun
  - mock
  - test-pollution
  - live-bindings
  - project
---

When using mock.module() from bun:test at module initialisation time (top-level, before any describe/it blocks), Bun replaces the module in the registry using live bindings. This means ALL other test files in the same bun test invocation that statically import that module will see the mock, not the real module. If the mock only exports a subset of the real module's exports, other test files get SyntaxError: Export named 'X' not found.

Root cause: Bun evaluates all test file module-level code before running any tests. mock.module() at module level runs during this phase and affects the shared module registry.

Fix: In thoughts-ai.spec.ts, import * as realModule from './ai-invoke.js' (static import, resolved before mock.module runs), then spread it into the mock factory: mock.module('./ai-invoke.js', () => ({ ...realModule, invokeAI: mockFn, invokeProviderThought: mockFn2 })). This ensures all named exports remain available via live bindings even after the mock is applied.

Also: vi.spyOn() in vitest leaks across test files if no afterEach(() => vi.restoreAllMocks()) is present. In ollama-selector.spec.ts, the sanitiseForPrompt spy was leaking and causing auto-selector heuristics tests to fail (spy returns 'thought' which matches no security keywords).

Pattern: If a test passes in isolation but fails in full suite, check for (1) module-level mock.module calls without full export spreading, (2) vi.spyOn without afterEach restoreAllMocks.
