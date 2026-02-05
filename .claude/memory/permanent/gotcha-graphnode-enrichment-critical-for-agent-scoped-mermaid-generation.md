---
id: gotcha-graphnode-enrichment-critical-for-agent-scoped-mermaid-generation
title: GraphNode enrichment critical for agent-scoped Mermaid generation
type: gotcha
scope: project
created: "2026-02-05T16:54:54.114Z"
updated: "2026-02-05T16:54:54.114Z"
tags:
  - phase-e
  - agent-scoping
  - graph-structure
  - project
---

When writing memories with agent scope, the GraphNode added to graph.json must include agent, scope, and title fields. Without these fields, Mermaid diagram generation with --agent flag produces empty diagrams because node filtering cannot identify which nodes belong to the specified agent.
