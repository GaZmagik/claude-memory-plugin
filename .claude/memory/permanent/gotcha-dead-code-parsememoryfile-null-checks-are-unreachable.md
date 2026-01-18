---
id: gotcha-dead-code-parsememoryfile-null-checks-are-unreachable
title: Dead code - parseMemoryFile null checks are unreachable
type: gotcha
scope: project
created: "2026-01-17T23:29:04.066Z"
updated: "2026-01-18T00:08:25.230Z"
tags:
  - dead-code
  - testing
  - frontmatter
  - architecture
  - project
severity: high
---

10+ places in maintenance/*.ts check `if (!parsed.frontmatter)` after calling parseMemoryFile. This is dead code because parseMemoryFile THROWS on invalid input - it never returns null frontmatter.

The mocks in test files (e.g., move.spec.ts, reindex.spec.ts) that force `frontmatter: null` are testing phantom error paths that can't occur in reality.

Files with dead null checks:
- move.ts:151
- rename.ts:126
- promote.ts:124
- reindex.ts:108
- sync-frontmatter.ts:102
- sync.ts:96,116
- refresh-frontmatter.ts:282,386
- prune.ts:87

Fix options:
1. Remove dead null checks (trust parseMemoryFile to throw)
2. Add try/catch around parseMemoryFile calls, test exception handling
3. Change parseMemoryFile API to return null instead of throwing

Option 1 is simplest but removes defensive coding. Option 2 is correct but requires test refactoring. Option 3 is breaking API change.
