---
id: learning-parallel-restoration-agents-improve-post-compaction-recovery-speed
title: Parallel restoration agents improve post-compaction recovery speed
type: learning
scope: project
created: "2026-02-04T09:48:12.135Z"
updated: "2026-02-04T09:48:12.135Z"
tags:
  - performance
  - compaction
  - memory-system
  - agents
  - efficiency
  - project
---

Running memory-recall, memory-curator, and check-gotchas agents in parallel after compaction reduces context restoration time significantly. Each agent has separate context budget, enabling efficient parallel work on memory graph health audit, linking, and gotcha checking simultaneously.
