---
id: learning-retro-restoration-agent-parallelisation-effective-but-hook-overhead-significant
title: Retro - Restoration agent parallelisation effective but hook overhead significant
type: learning
scope: project
created: "2026-02-06T00:05:56.461Z"
updated: "2026-02-06T00:05:56.461Z"
tags:
  - retrospective
  - process
  - restoration
  - hooks
  - parallelisation
  - project
severity: medium
---

Session-restore launched three restoration agents in parallel (memory-recall, memory-curator, check-gotchas). All three completed successfully and provided valuable context restoration. However, each agent took 2-3 minutes due to PreToolUse/PostToolUse hook chains executing for every tool call. For future sessions with similarly heavy hook overhead, consider: (1) batching operations to reduce hook invocations, (2) noting that parallel agent execution is still efficient despite hook latency because agents have separate context budgets, (3) the trade-off is acceptable for post-compact context restoration but would be inefficient for rapid iteration workflows.
