---
id: learning-cross-scope-edge-metadata-design-optional-fields-on-graphedge
title: "Cross-scope edge metadata design: optional fields on GraphEdge"
type: learning
scope: project
created: "2026-02-06T21:46:55.572Z"
updated: "2026-02-06T21:46:55.572Z"
tags:
  - project
---

Cross-scope edges carry metadata (sourceScope, targetScope, sourceAgent, targetAgent) as optional fields on GraphEdge. Enables scope tracking and filtering in traversal (calculateImpact, findOrphanedNodes) and display (cmdEdges --include-shared). Bidirectional storage ensures both graphs have the same edge with consistent metadata.
