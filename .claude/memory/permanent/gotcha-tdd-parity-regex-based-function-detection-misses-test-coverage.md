---
id: gotcha-tdd-parity-regex-based-function-detection-misses-test-coverage
title: TDD parity regex-based function detection misses test coverage
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-19T17:13:56.668Z"
updated: "2026-02-19T18:01:27.217Z"
tags:
  - tdd-parity
  - testing
  - typescript
  - project
---

TDD parity tool uses regex-based function detection for TypeScript (unlike AST-based Python analysis). This means it can miss test functions that don't follow strict naming patterns. Vitest/Jest tests like 'it("should do X")' don't map cleanly to source function names. Function-level parity reports for TypeScript should be treated as best-effort; file-level parity is more reliable.
