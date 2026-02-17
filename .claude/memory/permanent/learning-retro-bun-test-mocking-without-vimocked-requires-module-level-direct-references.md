---
id: learning-retro-bun-test-mocking-without-vimocked-requires-module-level-direct-references
title: Retro - Bun test mocking without vi.mocked() requires module-level direct references
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-05T16:11:58.341Z"
updated: "2026-02-16T22:30:07.451Z"
tags:
  - retrospective
  - process
  - bun
  - testing
  - mocking
  - tdd
  - project
severity: medium
---

When adapting Vitest patterns to Bun test runner, vi.mocked() is not available. Solution: define mocks at module scope using vi.fn(), then reference them directly in test without wrapping. Pattern: `const mockFn = vi.fn(); vi.mock('module', () => ({ default: { fn: mockFn } })); // use mockFn directly`. This works across all Bun tests. Verified working with formatScopeIndicator and scanAgentDirectories unit tests (13 tests each passing).
