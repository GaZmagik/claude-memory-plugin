---
id: decision-tdd-enforcement-caught-hook-pattern-edge-cases-early
title: TDD enforcement caught hook pattern edge cases early
type: decision
scope: project
project: claude-memory-plugin
created: "2026-01-12T20:40:21.659Z"
updated: "2026-01-12T22:02:47.198Z"
tags:
  - retrospective
  - process
  - tdd
  - memory-plugin
  - testing
  - project
---

# Retrospective: TDD Enforcement Caught Hook Edge Cases

TDD hook required test files before implementation. Tests for enforce-memory-cli revealed edge cases in bash pattern matching:
- Complex piped commands (cat | memory write - should pass)
- Absolute vs home-relative paths
- Read-only operations must whitelist cat without redirect vs cat with redirect

19 tests in enforce-memory-cli.spec.ts caught all these before hook registration. Prevented deployment of incomplete patterns.

Key insight: Mandatory test-first for hooks prevents silent enforcement failures. Patterns are harder to reason about than business logic - tests are essential.
