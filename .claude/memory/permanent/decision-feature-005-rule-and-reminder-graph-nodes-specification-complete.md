---
id: decision-feature-005-rule-and-reminder-graph-nodes-specification-complete
title: "Feature 005: Rule and Reminder Graph Nodes - Specification Complete"
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-19T04:21:09.741Z"
updated: "2026-02-19T06:33:18.794Z"
tags:
  - ready-for-planning
  - feature-005
  - external-files
  - graph-nodes
  - project
severity: medium
---

Created specification for rule and reminder graph node indexing. Two new MemoryType values (rule, reminder) for read-only external files. Key requirements: (1) Discovery - CLAUDE.md tree walk + rules/*.md + agent-memory MEMORY.md files, (2) Indexing - graph.json/index.json/embeddings.json integration with graceful Ollama fallback, (3) Read-only protection - block write/delete/rename/move/promote on external nodes, (4) Visualisation - hexagon shapes for rules, cylinder for reminders in Mermaid, (5) New edge types - governed-by and reminded-by. User stories prioritised: P1 rule discovery + read-only protection (foundational/safety), P2 reminder discovery + Mermaid rendering (enhancement), P3 index-context command (optimisation). All 26 acceptance scenarios defined, 8 edge cases covered, 23 functional requirements specified. Checklist validation: PASSED. Ready for /speckit:plan.
