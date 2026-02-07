---
id: gotcha-graphnode-enrichment-required-for-agent-filtering
title: GraphNode enrichment required for agent filtering
type: gotcha
scope: project
created: "2026-02-05T23:25:16.100Z"
updated: "2026-02-05T23:25:16.100Z"
tags:
  - phase-e
  - agent-scoping
  - mermaid
  - project
---

Agent-filtered Mermaid diagrams require GraphNode enrichment with agent, scope, and title fields. Without these, diagrams produce empty output despite valid data in graph.json. Discovered during T123 cmdMermaid --agent implementation.
