---
id: learning-resolvesharedscopepaths-helper-simplifies-multi-scope-memory-resolution
title: resolveSharedScopePaths helper simplifies multi-scope memory resolution
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-04T08:36:54.701Z"
updated: "2026-02-16T22:30:07.557Z"
tags:
  - helper-function
  - include-shared
  - scope-resolution
  - refactoring
  - project
---

Created helper function that resolves all shared scope paths (local, project, global) for an agent. Takes agent name and returns array of paths in correct priority order. Centralized this logic to avoid duplication across search, list, query commands.
