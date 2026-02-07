---
id: learning-bun-test-framework-mocking-requires-different-patterns-than-vitest
title: Bun test framework mocking requires different patterns than Vitest
type: learning
scope: project
created: "2026-02-02T20:39:33.143Z"
updated: "2026-02-02T20:39:33.143Z"
tags:
  - testing
  - bun
  - mocking
  - framework-differences
  - project
---

Bun's built-in test runner (bun:test) does not support vi.importActual() and has different mock isolation semantics than Vitest. Fixed T011-T012 mocking by using direct module re-exports rather than dynamic imports. Consider creating separate mock patterns documentation for Bun vs Vitest projects.
