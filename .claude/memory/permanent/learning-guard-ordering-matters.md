---
id: learning-guard-ordering-matters
title: Guard ordering matters - deleteMemory had critical timing bug
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-22T10:23:24.797Z"
updated: "2026-02-22T10:26:20.815Z"
tags:
  - feature-005
  - guards
  - external-nodes
  - testing
  - bug-pattern
  - project
---

The delete guard for external nodes ran AFTER file deletion instead of BEFORE, caught during Phase 2C integration tests (T110). Fix: move isExternalNode check before any filesystem operations. Critical lesson for all guard implementations.
