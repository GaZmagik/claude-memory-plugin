---
id: gotcha-execfilesync-in-bun-does-not-respect-path-environment-variable
title: execFileSync in Bun does not respect PATH environment variable
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-27T17:16:22.906Z"
updated: "2026-02-27T17:16:35.895Z"
tags:
  - bun
  - subprocess
  - environment-variables
  - runtime-specific
  - project
---

The Node.js execFileSync function does not properly respect the PATH environment variable when run in Bun runtime. This breaks CLI invocations. Solution: Convert to async execFile with callback wrapper, which properly inherits environment. Fixes both blocking I/O and environment variable issues.
