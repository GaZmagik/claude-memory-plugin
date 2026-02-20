---
id: gotcha-parsedargs-test-structure-confusion-causes-timeouts-when-command-name-included-in-positional-array
title: Gotcha - ParsedArgs test structure confusion causes timeouts when command name included in positional array
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-19T17:58:33.896Z"
updated: "2026-02-19T18:01:27.621Z"
tags:
  - retrospective
  - process
  - testing
  - cli
  - project
severity: medium
---

When creating tests for CLI commands that parse positional arguments, the ParsedArgs.positional array should contain only arguments AFTER the command name, not the command itself. Multiple guard test files initially included the command name in positional[0], causing tests to timeout waiting for stdin or other I/O. The fix: positional should only contain [id] for delete/rename/move/promote operations. Recommendation: Create a test fixture helper or documentation reference for correct ParsedArgs structure to prevent repetition.
