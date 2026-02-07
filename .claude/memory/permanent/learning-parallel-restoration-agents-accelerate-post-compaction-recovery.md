---
id: learning-parallel-restoration-agents-accelerate-post-compaction-recovery
title: Parallel restoration agents accelerate post-compaction recovery
type: learning
scope: project
created: "2026-02-05T16:12:42.168Z"
updated: "2026-02-05T16:12:42.168Z"
tags:
  - memory-system
  - post-compaction
  - parallelization
  - project
---

Using three parallel agents (memory-recall, memory-curator, check-gotchas) to restore context after compaction is more efficient than sequential restoration. Each agent gets its own context budget, and parallel execution completes in the time of the slowest agent rather than sum of all. Memory-curator linking prevents orphaned nodes during restoration.
