---
id: learning-retro-parallel-agent-restoration-recall-curator-gotchas-efficient-post-compact
title: Retro - Parallel agent restoration (recall, curator, gotchas) efficient post-compact
type: learning
scope: project
created: "2026-01-16T19:01:52.830Z"
updated: "2026-01-16T19:01:52.830Z"
tags:
  - retrospective
  - process
  - memory
  - agents
  - project
severity: medium
---

Post-compaction restoration spawning 3 agents in parallel (memory-recall for context, memory-curator for linking/quality, check-gotchas for warnings) was efficient and thorough. Fresh context window (~5% used) allowed all agents to operate without token contention. This pattern works well for restoration workflows where agents have independent concerns.
