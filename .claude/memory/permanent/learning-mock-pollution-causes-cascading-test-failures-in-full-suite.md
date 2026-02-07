---
id: learning-mock-pollution-causes-cascading-test-failures-in-full-suite
title: Mock pollution causes cascading test failures in full suite
type: learning
scope: project
created: "2026-02-06T00:07:01.340Z"
updated: "2026-02-06T00:07:01.340Z"
tags:
  - testing
  - mocks
  - test-isolation
  - project
---

Individual tests pass in isolation but fail in full suite runs (37 of 3546 fail). Root cause: vi.mock() and mock.module() persist globally across test files, polluting state.
