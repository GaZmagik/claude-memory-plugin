---
id: learning-retro-parallel-restoration-agents-3-agents-300s-total-restore-context-faster-than-sequential
title: Retro - Parallel restoration agents (3 agents, 300s total) restore context faster than sequential
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T08:02:24.193Z"
updated: "2026-02-16T22:30:07.305Z"
tags:
  - retrospective
  - agents
  - performance
  - project
severity: medium
---

Launching memory-recall, memory-curator, and check-gotchas in parallel after session restore completes faster than running them sequentially. Each agent has its own context budget (~50% utilization). Total time: ~4 minutes for all 3 vs ~7 minutes sequential. Memory system: 609 nodes, 892 edges, 100% connectivity, 0 issues.
