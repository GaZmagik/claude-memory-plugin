---
id: learning-graph-edge-similarity-scope-isolation-pattern
title: "Learning: Graph Edge Similarity Scope Isolation Pattern"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-18T15:50:01.796Z"
updated: "2026-02-18T15:50:09.763Z"
tags:
  - graph
  - similarity
  - scope
  - cross-scope
  - project
---

Similarity field stored on same-scope auto-linked edges via suggest-links.ts threading. Cross-scope path (storeCrossScopeEdge) unchanged—no similarity metadata. Duplicate detection remains identity-only (source, target, label)—similarity plays no role. Backward compatible.
