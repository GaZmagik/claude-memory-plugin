---
id: learning-cli-layer-testing-pattern-thin-wrappers
title: CLI Layer Testing Pattern - Thin Wrappers
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-12T18:00:59.206Z"
updated: "2026-01-16T23:10:44.205Z"
tags:
  - testing
  - typescript
  - cli
  - memory-skill
  - project
---

# CLI Layer Testing Pattern

CLI command handlers are thin wrappers around core library functions. Core is well-tested (1021 tests); CLI layer needs different testing strategy:

- **Dispatcher tests**: Verify routing, help system, unknown command handling
- **Command tests**: Mock core functions, verify arg parsing, ensure correct invocation
- **Integration**: Don't mock - test actual command behavior end-to-end

Key insight: Function-level mocking requires spying at setup time before module references are captured. Can't spy on already-bound references in handler registries.
