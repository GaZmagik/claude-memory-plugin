---
id: learning-complete-flag-infrastructure-removal-requires-coordinated-changes-across-multiple-layers
title: Complete flag infrastructure removal requires coordinated changes across multiple layers
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-09T14:12:20.636Z"
updated: "2026-02-16T22:30:07.575Z"
tags:
  - flags
  - infrastructure
  - deprecation
  - cleanup
  - coordination
  - project
---

Removing deprecated flag-based blocking required simultaneous changes: disabling flag creation in plugin hooks, removing flag-checking logic in global hooks, cleaning up related tests, and purging all flag files from disk. Single-file edits left orphaned flag-detection code, proving that infrastructure cleanup needs systematic, multi-layer coordination.
