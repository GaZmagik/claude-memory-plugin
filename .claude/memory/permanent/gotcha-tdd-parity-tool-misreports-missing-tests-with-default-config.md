---
id: gotcha-tdd-parity-tool-misreports-missing-tests-with-default-config
title: TDD parity tool misreports missing tests with default config
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T12:30:49.279Z"
updated: "2026-02-23T12:31:02.962Z"
tags:
  - tdd
  - testing
  - colocated-tests
  - project
---

TDD parity tool defaults to `--tests tests/unit/` which misses colocated `.spec.ts` files in src/. When source and test files colocate (e.g., src/foo.ts + src/foo.spec.ts), use `--tests src/` or create `.tddparity.json` with `"tests": "src/"` to get accurate reports. Without this, tool reports false positives (e.g., 131 'missing' when tests actually exist as colocated stubs).
