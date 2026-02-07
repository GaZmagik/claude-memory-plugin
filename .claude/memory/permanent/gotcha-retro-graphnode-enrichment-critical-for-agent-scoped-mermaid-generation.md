---
id: gotcha-retro-graphnode-enrichment-critical-for-agent-scoped-mermaid-generation
title: Retro - GraphNode enrichment critical for agent-scoped Mermaid generation
type: gotcha
scope: project
created: "2026-02-05T16:54:02.293Z"
updated: "2026-02-05T16:54:02.293Z"
tags:
  - retrospective
  - process
  - phase-e
  - graph-operations
  - project
severity: high
---

When implementing cmdMermaid with agent filtering, initial implementation passed agent name but GraphNode objects created during writeMemory only included {id, type}. This caused generateMermaid to fail filtering and styling because node.agent, node.scope, node.title were undefined. Fix: Ensure all graph operations populate complete node metadata (agent, scope, title) during write operations. Verify node structure matches implementation needs before Mermaid generation.
