---
type: learning
title: CLI Layer Testing Pattern - Thin Wrappers
created: "2026-01-12T18:00:59.206Z"
updated: "2026-01-12T18:00:59.206Z"
tags:
  - testing
  - typescript
  - cli
  - memory-skill
  - project
scope: project
---

# CLI Layer Testing Pattern

CLI command handlers are thin wrappers around core library functions. Core is well-tested (1021 tests); CLI layer needs different testing strategy:

- **Dispatcher tests**: Verify routing, help system, unknown command handling
- **Command tests**: Mock core functions, verify arg parsing, ensure correct invocation
- **Integration**: Don't mock - test actual command behavior end-to-end

Key insight: Function-level mocking requires spying at setup time before module references are captured. Can't spy on already-bound references in handler registries.
