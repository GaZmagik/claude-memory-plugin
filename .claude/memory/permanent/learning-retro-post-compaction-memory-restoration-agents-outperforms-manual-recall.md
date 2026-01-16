---
id: learning-retro-post-compaction-memory-restoration-agents-outperforms-manual-recall
title: Retro - Post-compaction memory restoration (agents) outperforms manual recall
type: learning
scope: project
created: "2026-01-16T17:06:02.325Z"
updated: "2026-01-16T17:06:02.325Z"
tags:
  - retrospective
  - process
  - context-restoration
  - agents
  - project
severity: medium
---

After session compaction, spawning three restoration agents (memory-recall, memory-curator, check-gotchas in parallel) faster and more complete than manual context reconstruction. Curator agent automatically calculated graph health improvement (79→94/100), identified orphaned nodes, and linked new memories. Result: Full context restored in <2min. Key: Agents have separate context budgets and parallel execution doesn't block main session.

Approach: Always spawn agents in parallel post-compact when restoring critical context. Skip if task is simple/atomic.
