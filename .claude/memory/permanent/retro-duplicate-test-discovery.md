---
id: retro-duplicate-test-discovery
title: "Duplicate test file detected: relevance.spec.ts mirrors relevance-scorer.spec.ts"
type: permanent
scope: local
project: claude-memory-plugin
created: "2026-01-11T19:16:14Z"
updated: "2026-01-12T22:06:28.748Z"
tags:
  - retrospective
  - process
  - quality
links:
  - learning-test-naming-convention-spec-ts
---

During TDD parity check, found orphaned test file relevance.spec.ts. Investigation showed it duplicates relevance-scorer.spec.ts (both test same source module). The orphan had worse naming convention. Process improvement: stricter test file naming conventions and duplicate detection in CI would catch this earlier. Consider consolidating test files by module, not duplicates.
