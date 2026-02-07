---
id: artifact-bun-test-mocking-pattern-without-vi-mocked
title: Bun test framework mocking pattern without vi.mocked() compatibility
type: artifact
scope: project
created: "2026-02-05T15:11:06.514Z"
updated: "2026-02-05T15:17:57.735Z"
tags:
  - phase-e
  - testing
  - bun
  - vitest-compat
  - project
  - agent-scoped-memories
---

Bun's test runner doesn't support vi.mocked() for accessing mock functions. Workaround: Define mock functions in module scope before vi.mock(), then reference them directly in tests instead of using vi.mocked(). Store mock references and call .mockResolvedValue() / .mockResolvedValueOnce() on them directly. Tested successfully with fs/promises mocking in test-scan-agents.spec.ts.
