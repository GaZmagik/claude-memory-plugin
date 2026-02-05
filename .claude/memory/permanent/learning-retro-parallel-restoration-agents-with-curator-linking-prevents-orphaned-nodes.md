---
id: learning-retro-parallel-restoration-agents-with-curator-linking-prevents-orphaned-nodes
title: Retro - Parallel restoration agents with curator linking prevents orphaned nodes
type: learning
scope: project
created: "2026-02-05T16:11:51.722Z"
updated: "2026-02-05T16:11:51.722Z"
tags:
  - retrospective
  - process
  - session-restore
  - memory-graph
  - agent-coordination
  - project
severity: high
---

Post-compaction session restoration using 3 parallel agents (memory-recall, memory-curator, check-gotchas) was highly effective. Memory curator agent immediately linked 5 new memories into knowledge graph, achieving 100/100 health (up from 88/100 with 4 orphaned nodes). This demonstrates that memory curation during restoration is critical - linking new memories prevents ghost nodes. Pattern: spawn curator agent in parallel with recall agent for post-compact workflows.
