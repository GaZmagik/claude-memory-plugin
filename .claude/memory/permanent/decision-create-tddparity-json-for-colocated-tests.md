---
id: decision-create-tddparity-json-for-colocated-tests
title: Create .tddparity.json to configure TDD parity tool for colocated tests
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-23T12:31:00.176Z"
updated: "2026-02-23T12:31:02.981Z"
tags:
  - tdd
  - testing
  - configuration
  - tooling
  - project
---

To avoid TDD parity misconfiguration gotchas, create `.tddparity.json` in memory plugin root with `{"src": "skills/memory/src", "tests": "skills/memory/src"}` configuration. This ensures parity tool automatically discovers colocated .spec.ts files without requiring manual `--tests src/` flags on every invocation.
