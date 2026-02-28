---
id: artifact-god-function-decomposition-pattern
title: God function decomposition pattern for complex functions
type: artifact
scope: project
created: "2026-02-28T03:30:53.727Z"
updated: "2026-02-28T03:30:53.727Z"
tags:
  - refactoring
  - patterns
  - testing
  - architecture
  - project
---

Pattern for decomposing large functions: extract ~5 focused helpers with single responsibilities (path resolution, validation, permission checks, write ops, graph updates), keep orchestrator slim (~45-50 lines), use same return types as helpers. Tested via existing test suite—no new tests needed for behaviour-preserving refactoring. Verification: run full test suite immediately to catch mock leakage and silent side effects.
