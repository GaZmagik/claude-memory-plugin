---
id: artifact-tdd-testing-patterns-catalogue
title: TDD Testing Patterns Catalogue
type: hub
scope: project
project: claude-memory-plugin
created: "2026-01-13T08:04:01.136Z"
updated: "2026-01-13T19:02:56.186Z"
tags:
  - tdd
  - testing
  - patterns
  - hub
  - project
links:
  - artifact-gotcha-prevention-checklist
---

# TDD Testing Patterns Catalogue

Central reference for Test-Driven Development patterns used in this project.

## Core Principles

- Tests before implementation (bidirectional enforcement via hooks)
- Colocated test files (`*.spec.ts` alongside source)
- Process isolation for mock safety

## Key Patterns

### Test Isolation
- Bun mock.module for dependency injection
- Fresh state per test (avoid global pollution)
- See: `learning-test-isolation-bun-mock-module`

### Coverage Strategy
- TDD parity validation (source ↔ spec file matching)
- 99%+ function coverage target
- See: `learning-test-coverage-achieved-99-percent-functions`

### Naming Conventions
- `.spec.ts` suffix for test files
- Descriptive test names matching behaviour
- See: `learning-test-naming-convention-spec-ts`

### Scope Resolution
- Module structure follows scope hierarchy
- See: `learning-tdd-scope-resolution-module-structure`

## Related Learnings

- `learning-tdd-typescript-hook-bidirectional-enforcement`
- `learning-tdd-test-coverage-expansion-pattern`
- `learning-tdd-phase-completion-pattern`
- `learning-cargo-cult-tdd-compliance`
