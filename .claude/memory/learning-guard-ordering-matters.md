---
type: learning
title: Guard ordering matters - deleteMemory had critical timing bug
tags: feature-005, guards, external-nodes, testing, bug-pattern
---

The delete guard for external nodes ran AFTER file deletion instead of BEFORE, caught during Phase 2C integration tests (T110). Fix: move isExternalNode check before any filesystem operations. Critical lesson for all guard implementations.
