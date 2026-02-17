---
id: learning-test-positional-array-structure-in-cli-command-tests
title: Test positional array structure in CLI command tests
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-04T13:20:05.670Z"
updated: "2026-02-16T22:30:07.183Z"
tags:
  - testing
  - cli
  - phase-d
  - project
---

When testing CLI commands directly (not through the parser), positional arrays should NOT include the command name. The parser strips it before calling the handler. Test failures showed positional: ['search', 'query'] should be positional: ['query'].
