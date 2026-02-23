---
id: artifact-large-file-refactoring-pattern
title: large-file-refactoring-pattern
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-23T12:16:47.270Z"
updated: "2026-02-23T12:16:51.047Z"
tags:
  - project
---

To refactor large single files (900+ lines): (1) Create directory with same name, (2) Extract logical sections into separate .ts files (types.ts, helpers.ts, entries/*.ts), (3) Create index.ts that re-exports everything, (4) Move spec to index.spec.ts, (5) Update consumers to import from new directory structure, (6) Delete original files. Parallel test runs verify no regressions (2888 tests passed for command-help + refresh-frontmatter refactor).
