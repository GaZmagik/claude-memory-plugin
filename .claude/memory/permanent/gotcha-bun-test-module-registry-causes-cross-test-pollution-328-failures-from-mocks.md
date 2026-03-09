---
id: gotcha-bun-test-module-registry-causes-cross-test-pollution-328-failures-from-mocks
title: Bun test module registry causes cross-test pollution (328 failures from mocks)
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-03-07T18:30:25.512Z"
updated: "2026-03-07T18:30:52.302Z"
tags:
  - bun
  - testing
  - architecture
  - limitation
  - project
---

When running all tests together via `bun test`, 328 failures appear (down from 523 on main). Every single test passes individually. Root cause: Bun's shared module registry leaks mocks between test files—vi.mock() state persists across tests unless explicitly cleaned with mock.restore(). Pre-existing architectural limitation, not code bugs.
