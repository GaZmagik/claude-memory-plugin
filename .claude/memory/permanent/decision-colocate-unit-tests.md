---
id: decision-colocate-unit-tests
title: colocate-unit-tests
type: decision
scope: local
project: claude-memory-plugin
created: "2026-01-11T23:27:12Z"
updated: "2026-01-13T18:49:49.835Z"
tags:
  - decision
  - adr
  - architecture
  - accepted
links:
  - learning-test-naming-convention-spec-ts
  - learning-tdd-scope-resolution-module-structure
  - learning-tdd-test-coverage-expansion-pattern
  - artifact-tdd-testing-patterns-catalogue
---

# colocate-unit-tests

**Status:** accepted
**Date:** 2026-01-11

## Context

Debate about test file organization - separate tests/unit vs colocated with source

## Decision

Colocate unit tests with source code. Skills go in skills/memory/src/*.spec.ts. Hooks go in .claude/hooks/ts/*.spec.ts. Keep integration/contract tests in tests/integration and tests/contract.

## Consequences

No consequences documented

## Alternatives Considered

No alternatives documented
