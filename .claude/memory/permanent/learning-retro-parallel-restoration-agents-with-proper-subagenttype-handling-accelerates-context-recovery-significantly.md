---
id: learning-retro-parallel-restoration-agents-with-proper-subagenttype-handling-accelerates-context-recovery-significantly
title: Retro - Parallel restoration agents with proper subagent_type handling accelerates context recovery significantly
type: learning
scope: project
created: "2026-02-06T08:50:28.905Z"
updated: "2026-02-06T08:50:28.905Z"
tags:
  - retrospective
  - process
  - restoration
  - agents
  - parallel
  - project
severity: medium
---

Launching three restoration agents in parallel (memory-recall, memory-curator, check-gotchas using distinct subagent_type values: claude-memory-plugin:recall, claude-memory-plugin:curator, general-purpose) proved effective for post-compaction context recovery. Each agent completed independently with fresh context budget, and the approval key system ensured /session-continue could only proceed once all three had finished. This pattern scales better than sequential restoration and provides richer context (memory linking analysis + gotcha surfacing + recall summary in parallel). Key: MUST use different subagent_type for each agent — using same type twice causes key overwrites and /session-continue blocks indefinitely.
