---
id: learning-toctou-security-fix-move-guards-before-file-operations
title: "TOCTOU Security Fix: Move Guards Before File Operations"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-20T17:45:43.900Z"
updated: "2026-02-20T17:46:01.951Z"
tags:
  - security
  - pattern
  - toctou
  - file-operations
  - project
---

When validating external node operations (write/rename/move/promote), move type/permission checks to BEFORE file operations, not after. Prevents Time-of-Check-to-Time-of-Use vulnerabilities where file state changes between check and operation.
