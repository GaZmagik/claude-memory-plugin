---
id: learning-session-restore-launches-three-parallel-agents-for-context-recovery
title: Session restore launches three parallel agents for context recovery
type: learning
scope: project
created: "2026-01-25T16:26:53.097Z"
updated: "2026-01-25T16:26:53.097Z"
tags:
  - session-restore
  - memory
  - compaction
  - agents
  - project
---

After compaction, /session-restore spawns memory-recall, memory-curator, and check-gotchas agents in parallel to restore context. Each agent requires a unique subagent_type to create approval keys. Parallel execution saves context window during restoration.
