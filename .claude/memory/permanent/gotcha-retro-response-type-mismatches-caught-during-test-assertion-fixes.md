---
id: gotcha-retro-response-type-mismatches-caught-during-test-assertion-fixes
title: Retro - Response type mismatches caught during test assertion fixes
type: gotcha
scope: project
created: "2026-01-18T12:15:45.018Z"
updated: "2026-01-18T12:15:45.018Z"
tags:
  - retrospective
  - process
  - testing
  - types
  - project
severity: medium
---

While adding content validation to test assertions (#6), discovered response types were inconsistent:

- **Core layer**: Uses `WriteMemoryResponse` with `memory` property
- **CLI layer**: Uses generic `CliResponse<T>` with `data` property  
- **Delete operation**: Uses `deletedId` not `id`

**The issue**: Tests were written assuming one structure but were actually using another. The weak assertions (status-only checks) masked this mismatch.

**How to prevent**: 
1. When adding content validation to tests, always check response type definitions first
2. Use IDE type inference to validate expected property names
3. Weak assertions hide type mismatches - always validate response structure

**This bit us**: Had to iterate multiple times on test IDs because assertions were generic.
