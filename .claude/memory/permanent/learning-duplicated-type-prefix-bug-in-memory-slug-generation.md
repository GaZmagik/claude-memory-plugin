---
id: learning-duplicated-type-prefix-bug-in-memory-slug-generation
title: Duplicated type prefix bug in memory slug generation
type: learning
scope: project
created: "2026-01-21T20:07:28.982Z"
updated: "2026-01-21T20:07:28.982Z"
tags:
  - memory-system
  - bug
  - architecture
  - duplicate-prefix
  - project
---

Memory files are created with duplicated prefixes (e.g., gotcha-gotcha-*.md) because the ID generation layer does not check if a title already contains the type prefix before adding it. Root cause is in slug.ts where both think/conclude.ts and core/write.ts paths apply prefixes independently without sanitisation. Fix requires adding a stripTypePrefix() function at the ID generation layer to sanitise titles.
