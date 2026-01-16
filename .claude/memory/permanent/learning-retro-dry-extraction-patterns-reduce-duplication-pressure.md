---
id: learning-retro-dry-extraction-patterns-reduce-duplication-pressure
title: Retro - DRY extraction patterns reduce duplication pressure
type: learning
scope: project
created: "2026-01-16T16:38:07.690Z"
updated: "2026-01-16T16:38:07.690Z"
tags:
  - retrospective
  - refactoring
  - DRY
  - project
severity: medium
---

Found three identical implementations of getAllMemoryIds() across refresh-frontmatter.ts, sync-frontmatter.ts, and assess.ts. Extracting to fs-utils.ts as a shared utility eliminated 87 lines of duplication and created reusable MEMORY_SUBDIRS constant. Pattern: Look for repeated directory iteration patterns (permanent/temporary) as extraction opportunity.
