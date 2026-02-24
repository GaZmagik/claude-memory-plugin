---
id: gotcha-file-cleanup-obligations-must-be-enforced-in-all-code-paths-not-just-happy-path
title: File cleanup obligations must be enforced in all code paths, not just happy path
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T20:53:18.674Z"
updated: "2026-02-23T20:53:31.534Z"
tags:
  - file-management
  - resource-cleanup
  - error-handling
  - pr-043
  - project
---

Temp files that are renamed/claimed must be cleaned up unconditionally, including in error paths, skip paths, and context-miss scenarios. Not cleaning up in all paths leads to slow accumulation of stale files. Use guards or finally blocks to ensure cleanup happens regardless of code path taken.
