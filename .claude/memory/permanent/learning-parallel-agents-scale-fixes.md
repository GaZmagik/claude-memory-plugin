---
id: learning-parallel-agents-scale-fixes
title: Parallel agents effectively scale large-scale systematic fixes across many files
type: learning
scope: project
project: claude-memory-plugin
created: "2026-03-01T15:18:17.996Z"
updated: "2026-03-07T18:30:52.287Z"
tags:
  - automation
  - agents
  - testing
  - patterns
  - parallelisation
  - project
---

Dispatched 9 parallel agents to fix 50+ files (source + tests) organised by module group. Each agent handled scope/resolver tests, CLI tests, integration tests, think/suggest tests, source crud/graph/maintenance/utility files separately. Agents worked in parallel whilst main session tracked progress. Successfully reduced time-to-fix vs. sequential approach, and allowed main session to work on other issues (vi.hoisted fixes, hook tests) in parallel.
