---
id: learning-stub-first-tdd-pattern-write-all-failing-tests-before-implementing
title: "Stub-first TDD pattern: write all failing tests before implementing"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-18T17:11:31.396Z"
updated: "2026-02-18T17:12:06.105Z"
tags:
  - tdd
  - testing
  - vitest
  - pattern
  - phase-d
  - project
---

Writing all failing tests first (ollama.spec.ts, suggest-links additions, link-update additions) before any implementation prevented cascading TS errors and blocked hook issues. Red-Green-Refactor parity enforced by pre-commit hook.
