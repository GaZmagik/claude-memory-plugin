---
id: learning-test-naming-convention-spec-ts
title: "Test file naming convention: <name>.spec.ts (drop test- prefix)"
type: learning
scope: local
project: claude-memory-plugin
created: "2026-01-11T13:58:15Z"
updated: "2026-01-13T18:49:49.826Z"
tags:
  - plugin
  - tests
  - naming
  - convention
links:
  - learning-typescript-import-path-consistency-prevents-batch-compilation-failures
  - artifact-tdd-testing-patterns-catalogue
---

## Change

Renamed 38 test files from `test-*.spec.ts` to `*.spec.ts` (dropped test- prefix).

## Rationale

- **Matches source files**: `skills/memory/src/core/frontmatter.ts` ↔ `tests/unit/core/frontmatter.spec.ts`
- **Less redundant**: `.spec` suffix already indicates test file
- **Mirrors Python convention**: `test_file.py` → `test_file.spec.ts` (suffix instead of prefix)
- **Industry standard**: Most TS/JS projects use `.spec.ts` or `.test.ts` without redundant prefixes

## Implementation

Batch rename via loop: `find tests -name "test-*.spec.ts" | while read f; do mv "$f" "${f/test-/}"; done`

Vitest configured to find both `*.spec.ts` and `*.test.ts` via glob pattern in `vitest.config.ts`.

All 580 tests passing after rename.
