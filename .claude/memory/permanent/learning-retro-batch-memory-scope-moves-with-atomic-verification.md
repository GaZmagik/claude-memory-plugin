---
id: learning-retro-batch-memory-scope-moves-with-atomic-verification
title: Retro - Batch memory scope moves with atomic verification
type: learning
scope: project
created: "2026-01-16T23:12:23.754Z"
updated: "2026-01-16T23:12:23.754Z"
tags:
  - retrospective
  - process
  - memory-operations
  - project
severity: medium
---

Moving 60+ memories across scopes worked smoothly because: (1) Clear categorisation rules identified candidates upfront, (2) Separate operations (project→user, local→project) rather than complex multi-step migration, (3) Verification before/after (memory stats) confirmed success. Pattern: for bulk operations, automate repetitively and verify as a group, not individually. Saved time vs cherry-picking each memory.
