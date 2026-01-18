---
id: learning-retro-parallel-restoration-agents-unblock-main-session-during-compaction
title: Retro - Parallel restoration agents unblock main session during compaction
type: learning
scope: project
created: "2026-01-17T23:06:42.004Z"
updated: "2026-01-17T23:06:42.004Z"
tags:
  - retrospective
  - process
  - agents
  - performance
  - project
severity: medium
---

After compaction, spawning 3 independent agents (memory-recall, memory-curator, check-gotchas) with separate context budgets prevented main session from being stuck during retrospective. Each agent had approval keys that /session-continue waited for. Pattern: use parallel agents when expensive operations (memory queries, curation, auditing) need to complete before main session resumes.
