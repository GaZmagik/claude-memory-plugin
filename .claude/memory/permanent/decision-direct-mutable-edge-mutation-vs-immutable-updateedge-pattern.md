---
id: decision-direct-mutable-edge-mutation-vs-immutable-updateedge-pattern
title: direct mutable edge mutation vs immutable updateEdge pattern
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-23T22:36:02.275Z"
updated: "2026-02-23T22:36:09.570Z"
tags:
  - score-edges
  - design
  - mutations
  - project
---

Chose direct mutation over immutable updateEdge() because --apply needs delete edge.verifiedRelation. Immutable pattern cannot express deletion. Pattern: mutate all edges in-memory, validate once, save graph once. Matches link-update.ts precedent.
