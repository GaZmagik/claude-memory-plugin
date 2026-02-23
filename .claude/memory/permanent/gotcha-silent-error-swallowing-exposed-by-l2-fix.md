---
id: gotcha-silent-error-swallowing-exposed-by-l2-fix
title: Silent error swallowing exposed by L2 fix
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T17:29:02.443Z"
updated: "2026-02-23T17:29:22.620Z"
tags:
  - suggest-links
  - security
  - error-handling
  - testing
  - project
---

Security fix L2 changed silent catch {} blocks to log to stderr. Tests that relied on errors disappearing now fail visibly. Always restore error handling expectations when fixing silent catches—stderr logging exposes previously hidden test failures.
