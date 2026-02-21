---
id: learning-retro-type-safety-refactoring-requires-union-type-design-before-wholesale-as-any-replacement
title: Retro - Type safety refactoring requires union type design before wholesale 'as any' replacement
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-21T12:21:47.721Z"
updated: "2026-02-21T12:24:05.233Z"
tags:
  - retrospective
  - process
  - typescript
  - refactoring
  - project
severity: medium
---

Attempted to replace 'as any' casts in CRUD operations but hit type mismatches when different functions return different result types (MemorySummary[] vs SearchResult[] vs SemanticSearchResultItem[]). Simple text replacement fails. Future type safety work needs: 1) Audit all result types across related functions, 2) Design appropriate union types or discriminated unions, 3) Update callsites with proper type guards. Lesson: complex refactoring benefits from upfront type architecture analysis.
