---
id: gotcha-unbounded-loops-in-background-operations-accumulate-work-and-hit-timeouts
title: Unbounded loops in background operations accumulate work and hit timeouts
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T20:53:08.906Z"
updated: "2026-02-23T20:53:31.368Z"
tags:
  - concurrency
  - performance
  - background-jobs
  - resource-management
  - pr-043
  - project
---

Background subagent sweep loops without resource caps can allow 20+ concurrent agents to process, each potentially hitting 30s timeouts. Fixed with MAX_SUBAGENT_SWEEP = 10 cap. Applies to any concurrent background processing where you don't control the entry count.
