---
id: gotcha-retro-check-api-contracts-before-debugging-validation-errors
title: Retro - Check API contracts before debugging validation errors
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-05T16:10:25.335Z"
updated: "2026-02-16T22:30:07.493Z"
tags:
  - retrospective
  - process
  - testing
  - api-design
  - project
severity: medium
---

Spent time debugging 'ID prefix mismatch' errors in integration tests. Root cause: writeMemory automatically adds type prefix to memory IDs. Should have checked the WriteMemoryRequest interface and write.ts implementation first. Prevention: Always review API contracts (interfaces, type definitions) before implementing features that call APIs, especially validation logic.
