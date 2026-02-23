---
id: gotcha-vitest-spy-leak-without-aftereach-restore
title: "Gotcha: Vitest spy leaks previous test values without afterEach restore"
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T06:32:27.410Z"
updated: "2026-02-23T06:32:34.944Z"
tags:
  - test-isolation
  - vitest
  - mocking
  - project
---

vi.spyOn() mocks persist across tests when vi.restoreAllMocks() is not called in afterEach(). The last spy's return value bleeds into subsequent tests, causing them to receive stale mocked values instead of real values. Example: ollama-selector.spec.ts spied on sanitiseForPrompt returning 'thought' - this leaked into auto-selector.spec.ts causing heuristics matching to fail because 'thought' had no keywords. Fix: add afterEach(() => vi.restoreAllMocks()) to every test file using vi.spyOn().
