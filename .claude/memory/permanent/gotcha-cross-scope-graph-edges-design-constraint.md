---
id: gotcha-cross-scope-graph-edges-design-constraint
title: Cross-Scope Graph Edges Design Constraint
type: gotcha
scope: project
created: "2026-02-04T16:57:40.837Z"
updated: "2026-02-04T16:57:40.837Z"
tags:
  - design
  - phase-d
  - graph
  - scope
  - project
---

Graph edges cannot cross scope boundaries in agent-scoped memory system. Multi-scope operations (--include-shared) enable READ across scopes but WRITE remains single-scope only. Link operations must reject --include-shared to maintain scope isolation.
