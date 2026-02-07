---
id: gotcha-cross-scope-edge-cleanup-on-delete-must-scan-for-matching-edges
title: Cross-scope edge cleanup on delete must scan for matching edges
type: gotcha
scope: project
created: "2026-02-06T21:00:55.187Z"
updated: "2026-02-06T21:00:55.187Z"
tags:
  - phase-d
  - delete
  - cross-scope
  - cleanup
  - project
---

When deleteMemory() removes a node, scanning the primary graph is sufficient to find all cross-scope edges involving that node, because cross-scope edges are mirrored identically in both graphs. Must resolve 'other' scope's basePath from edge metadata (sourceScope/targetScope/sourceAgent/targetAgent) before removing from other graph. Best-effort: silent fallback if other graph unreachable.
