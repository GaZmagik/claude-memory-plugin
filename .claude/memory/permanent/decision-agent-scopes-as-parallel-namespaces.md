---
id: decision-agent-scopes-as-parallel-namespaces
title: Agent Scopes as Parallel Namespaces (Not Sub-Scopes)
type: decision
scope: project
created: "2026-02-04T16:57:44.505Z"
updated: "2026-02-04T16:57:44.505Z"
tags:
  - architecture
  - design
  - phase-a
  - project
---

Architectural decision: Agent scopes are parallel namespaces, not sub-scopes of project/global. Prevents hierarchy confusion, provides clear mental model, simplifies implementation. Trade-off: Requires explicit --agent flag for all agent operations.
