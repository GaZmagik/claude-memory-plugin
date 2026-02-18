---
id: artifact-phase-a-similarity-field-on-graphedge-implementation-pattern
title: "Phase A: Similarity Field on GraphEdge — Implementation Pattern"
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-18T15:49:55.896Z"
updated: "2026-02-18T15:50:09.700Z"
tags:
  - v1.5.0
  - phase-a
  - similarity
  - graph-edge
  - tdd
  - project
---

TDD-first pattern for adding optional numeric fields to GraphEdge. Similarity (cosine [0–1]) stored on same-scope auto-linked edges only; cross-scope path unchanged. Backward compatible—existing edges load with undefined. Tests drive structure changes (structure.ts → operations.ts → suggest-links.ts → link.ts threading). 77 Phase A tests pass; 2538 total suite clean.
