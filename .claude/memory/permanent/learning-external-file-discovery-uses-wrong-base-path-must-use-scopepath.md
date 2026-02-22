---
id: learning-external-file-discovery-uses-wrong-base-path-must-use-scopepath
title: External file discovery uses wrong base path - must use scopePath
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-21T05:31:47.301Z"
updated: "2026-02-21T05:32:14.314Z"
tags:
  - external-nodes
  - maintenance
  - scope-resolution
  - bug-fix
  - project
---

External file discovery in maintenance.ts was using os.homedir() instead of the scope-specific base path from getResolvedScopePath(). This caused CLAUDE.md in project scope to not be indexed. Graph and index must be explicitly saved after updates.
