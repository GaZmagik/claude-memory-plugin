---
id: gotcha-external-file-discovery-must-constrain-to-basepath-to-avoid-walking-into-parent-directories
title: External file discovery must constrain to basePath to avoid walking into parent directories
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-19T11:03:23.347Z"
updated: "2026-02-19T11:03:33.222Z"
tags:
  - external-module
  - discovery
  - testing
  - scope
  - project
---

Discovery naturally walks up directory tree (home, project root, etc) to find CLAUDE.md and .claude-context files. In sync operations, must pass basePath as stopPath constraint to prevent discovering files outside the current scope. Unconstrained discovery pollutes test isolation with external project files.
