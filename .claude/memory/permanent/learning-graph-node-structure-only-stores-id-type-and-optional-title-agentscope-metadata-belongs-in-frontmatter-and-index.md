---
id: learning-graph-node-structure-only-stores-id-type-and-optional-title-agentscope-metadata-belongs-in-frontmatter-and-index
title: Graph node structure only stores id, type, and optional title - agent/scope metadata belongs in frontmatter and index
type: learning
scope: project
created: "2026-02-03T05:50:39.838Z"
updated: "2026-02-03T05:50:39.838Z"
tags:
  - agent-scoped
  - architecture
  - test-design
  - project
---

During Phase B test fixing, discovered that MemoryGraph nodes and edges are arrays (not objects) and only store id, type, and optional title. Agent and scope metadata should never be added to graph structure - it belongs in frontmatter and index. This was causing test confusion where tests were incorrectly attempting to store agent/scope in graph nodes.
