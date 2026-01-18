---
id: gotcha-retro-test-suite-shouldnt-write-to-claudememory-without-cleanup
title: Retro - Test suite shouldn't write to .claude/memory without cleanup
type: gotcha
scope: project
created: "2026-01-17T00:31:50.690Z"
updated: "2026-01-17T00:31:50.690Z"
tags:
  - retrospective
  - testing
  - isolation
  - project
severity: medium
---

During mermaid implementation, the test suite ran generateMermaid() with mock data and the CLI wrote output to .claude/memory/graph.md. This overwrote the real graph and made the file appear empty during dev. Prevention: (1) Mock file paths to temp directories in tests, (2) Add pre-test cleanup hook to reset .claude/memory, or (3) Make CLI commands detect test environment.
