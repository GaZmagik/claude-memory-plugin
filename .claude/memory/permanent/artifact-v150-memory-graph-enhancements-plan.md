---
id: artifact-v150-memory-graph-enhancements-plan
title: v1.5.0 Memory Graph Enhancement Suite Plan
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-17T08:01:41.816Z"
updated: "2026-02-17T08:02:05.369Z"
tags:
  - v1.5.0
  - planning
  - architecture
  - memory-graph
  - project
---

v1.5.0 Memory Graph Enhancement Suite: 4 interdependent features planned. Implementation sequence: (1) semantic similarity on edges — one-line type extension, no new deps; (2) update-edge command + link.ts refactor — promotes verifiedRelation to label, supports backfilling; (3) check-relevance command — scope optimisation via multi-factor scoring (type, tags, connectivity, content); (4) LLM link type verification — local Ollama model (gemma3:4b default) to confirm inferred relations before writing. Exploration file documents all architectural decisions and trade-offs.
