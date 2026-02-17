---
id: learning-tdd-driven-validation-prevents-cross-scope-access-misuse
title: TDD-driven validation prevents cross-scope access misuse
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-04T08:36:41.063Z"
updated: "2026-02-16T22:30:07.456Z"
tags:
  - tdd
  - validation
  - include-shared
  - agent-scope
  - project
---

Writing validation tests before implementation revealed that --include-shared flag must reject write operations and require --agent flag on read operations. This caught architectural violations early that would have been harder to debug later.
