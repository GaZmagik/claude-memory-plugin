---
id: gotcha-retro-multi-phase-features-need-explicit-memory-checkpoints-between-phases-for-context-continuity
title: Retro - Multi-phase features need explicit memory checkpoints between phases for context continuity
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-18T15:50:46.047Z"
updated: "2026-02-18T17:12:06.122Z"
tags:
  - retrospective
  - process
  - speckit
  - phases
  - memory
  - v1.5.0
  - project
severity: medium
---

Phase A (Similarity on Edges) completed cleanly with tests passing and memory artifact recorded. Phase B (Update Edge Metadata) started without a checkpoint summary—no explicit 'Phase A done: 77 tests passing, link-update.ts created, cmdUpdateEdge registered' record. This forced Phase B to re-read specs and code to understand where Phase A ended. For multi-phase features: after phase completion, write a checkpoint memory (type: artifact) summarizing: (1) what passed, (2) what new files/functions exist, (3) what Phase N+1 depends on. This prevents context loss and accelerates phase handoff.
