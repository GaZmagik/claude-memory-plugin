---
id: gotcha-parallel-expert-agents-on-overlapping-code-phases-risk-merge-conflicts
title: Gotcha - Parallel expert agents on overlapping code phases risk merge conflicts
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-26T19:12:55.387Z"
updated: "2026-02-26T19:14:22.041Z"
tags:
  - retrospective
  - process
  - sub-agents
  - parallel-work
  - project
severity: high
---

Dispatching multiple sub-agents in parallel to work on independent phases (e.g., performance + TypeScript fixes) can cause file conflicts if phases touch overlapping code paths or shared utilities. Phase 5 (TypeScript) and Phase 4 (code quality refactoring) both touch type safety / DRY extractions. Mitigation: Use stage-gates between phases, or coordinate agent dispatch to avoid file overlap. Lesson: Parallelism is efficient but requires dependency tracking.
