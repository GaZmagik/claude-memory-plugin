---
id: learning-test-naming-convention-spec-ts
title: Test file naming convention: <name>.spec.ts (drop test- prefix)
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-11T13:58:15Z
updated: 2026-01-12T07:58:00Z
tags: ["plugin","tests","naming","convention"]
embedding: "e8d82950a83123b4e474149a8be99cb6"
links: [
  "learning-typescript-import-path-consistency-prevents-batch-compilation-failures"
]
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
