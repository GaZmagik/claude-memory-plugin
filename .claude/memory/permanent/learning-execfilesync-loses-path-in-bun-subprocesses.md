---
id: learning-execfilesync-loses-path-in-bun-subprocesses
title: execFileSync loses PATH in Bun subprocesses
type: learning
scope: project
created: "2026-01-25T20:51:44.497Z"
updated: "2026-01-25T20:51:44.497Z"
tags:
  - bun
  - execfilesync
  - environment
  - providers
  - gotcha
  - project
---

When using execFileSync in Bun to spawn child processes, the PATH environment variable is not automatically inherited from the parent process. This causes provider CLI commands (claude, codex, gemini) to fail unless called with absolute paths. Solution: always use absolute paths when invoking external CLIs from Bun child processes, or explicitly pass PATH in env option.
