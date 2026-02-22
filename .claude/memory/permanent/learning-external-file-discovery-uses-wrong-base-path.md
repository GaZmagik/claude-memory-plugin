---
id: learning-external-file-discovery-uses-wrong-base-path
title: External file discovery uses wrong base path
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-21T03:42:57.792Z"
updated: "2026-02-21T03:45:38.964Z"
tags:
  - external-files
  - path-resolution
  - bug
  - project
---

cmdIndexContext passed basePath (memory storage dir) to discovery instead of project root. Result: discovery looked in .claude/memory/ for CLAUDE.md and rules/ instead of project root. Fixed by passing gitRoot and cwd from caller context.
