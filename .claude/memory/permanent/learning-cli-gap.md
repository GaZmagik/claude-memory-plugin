---
type: learning
title: Memory Skill TypeScript Library Has No CLI Entry Point
created: "2026-01-12T15:45:00Z"
updated: "2026-01-12T17:15:29.489Z"
tags:
  - cli
  - architecture
  - discovery
  - critical
scope: project
severity: high
---

# Discovery: Memory Skill TypeScript Library Has No CLI Entry Point

## The Gap

The TypeScript memory plugin (`skills/memory/src/`) contains ~75 well-designed functions covering ~18 commands, but has **zero CLI wrapper**. The shell implementation at `~/.claude/skills/memory.disabled/memory.sh` has the dispatcher and 36+ commands, but the TypeScript migration never included a `memory.sh` or CLI entry point.

## Why This Matters

- SKILL.md documents a shell CLI interface (`memory <command>`) that doesn't exist in the TypeScript implementation
- Memories were being created through hooks that spawn forked sessions—these hooks call the user's installed memory skill, NOT the plugin's TypeScript library directly
- The plugin is a pure library with no way to invoke it from the CLI
- Commands like `/memory-commit` work because they spawn new Claude processes that call the external memory skill, not the plugin code

## Resolution

Created a 6-phase plan to implement a TypeScript CLI dispatcher that:
1. Mirrors the shell architecture (command registry, JSON response envelope)
2. Wires existing functions to CLI commands
3. Implements 18 missing commands in phases 2-6
4. Updates SKILL.md to reflect TypeScript reality

## Critical Pattern Discovery

The `getScopePath()` function signature is `getScopePath(scope, cwd, globalPath)`, not just `getScopePath(scope)`. All command handlers must pass `(cwd, globalMemoryPath)` or resolution fails.
