---
id: learning-retro-error-handling-test-pattern-with-call-counting-mocks-for-race-conditions
title: Retro - Error handling test pattern with call-counting mocks for race conditions
type: learning
scope: project
created: "2026-01-16T20:48:54.636Z"
updated: "2026-01-16T20:48:54.636Z"
tags:
  - retrospective
  - testing
  - mocking
  - race-conditions
  - project
severity: medium
---

To test race condition scenarios (e.g., file exists check returns false, then later returns true), use a counter variable in vi.spyOn() mockImplementation to track call count. Example: permanent file check fails first time (findMemoryFile), succeeds later (move check) - simulates TOCTOU. This pattern works for any scenario requiring state-dependent mock behavior across multiple invocations.
