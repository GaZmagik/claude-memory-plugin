---
id: retro-frontend-type-field-indicates-git-files-stale
title: Frontend type field values indicate when git-tracked files are stale
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-13T19:10:30.000Z"
updated: "2026-01-13T19:45:06.424Z"
tags:
  - retrospective
  - process
  - debugging
  - devops
---

When the `memory list --json` command shows `type: permanent` for 34 files, but frontmatter inspection shows the correct types, the index.json is stale.

This is a useful diagnostic signal - mismatch between what the tool reports and what's on disk indicates the index needs rebuilding. Don't manually edit index.json; run `memory rebuild` to regenerate from source of truth (frontmatter).

Similarly, if graph.json shows wrong types after frontmatter was corrected, run `memory refresh` to sync.
