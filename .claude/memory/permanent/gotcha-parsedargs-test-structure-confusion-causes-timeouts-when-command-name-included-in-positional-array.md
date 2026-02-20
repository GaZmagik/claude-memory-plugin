---
id: gotcha-parsedargs-test-structure-confusion-causes-timeouts-when-command-name-included-in-positional-array
title: ParsedArgs test structure confusion causes timeouts when command name included in positional array
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-20T06:47:46.360Z"
updated: "2026-02-20T06:47:53.689Z"
tags:
  - testing
  - cli-commands
  - ParsedArgs
  - debug
  - project
---

When testing CLI commands with ParsedArgs mock, avoid including the command name in the positional array (e.g., ['read', 'id'] is wrong). Only pass actual arguments like ['id']. Including the command name causes the parser to misinterpret arguments and can lead to hanging/timeout tests.
