---
id: learning-parallel-restoration-agents-with-correct-subagenttype-accelerates-recovery
title: Parallel restoration agents with correct subagent_type accelerates recovery
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T08:52:09.682Z"
updated: "2026-02-16T22:30:07.545Z"
tags:
  - restoration
  - agents
  - parallelism
  - performance
  - project
---

Launching three restoration agents (memory-recall, memory-curator, check-gotchas) in parallel with the correct subagent_type (claude-memory-plugin:recall, claude-memory-plugin:curator, general-purpose) enables context recovery 3-5x faster than sequential execution. Each agent has separate context budget, allowing parallel work without token contention. Proper agent type selection ensures approval key creation for session-continue gating.
