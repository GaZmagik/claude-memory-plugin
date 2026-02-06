---
id: artifact-phase-d-edge-mirroring-pattern
title: "Edge Mirroring Pattern: Bidirectional Storage Without Reversal"
type: artifact
scope: project
created: "2026-02-06T20:44:14.469Z"
updated: "2026-02-06T20:44:14.469Z"
tags:
  - phase-d-deferred
  - graph
  - pattern
  - project
---

For cross-scope graph operations, store the same edge in both scopes' graph.json files (e.g., agent→project edge appears identically in agent.graph.json AND project.graph.json). Cleaner semantics than edge reversal; simplifies traversal and orphan detection. Enables best-effort cleanup: if one scope's graph unreachable, deletion proceeds without blocking.
