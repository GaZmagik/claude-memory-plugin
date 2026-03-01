---
id: gotcha-parallel-expert-agents-on-overlapping-code-phases-risk-merge-conflicts
title: Gotcha - Parallel expert agents on overlapping code phases risk merge conflicts
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-26T21:58:41.602Z"
updated: "2026-02-26T21:59:30.949Z"
tags:
  - retrospective
  - process
  - gotcha
  - agent-coordination
  - merge-conflicts
  - project
severity: high
---

When dispatching multiple agents to work on parallel phases of a code review, ensure strict non-overlapping file scope. In this session, Phase 3 agent modified graph/traversal.ts and Phase 5 agent modified the same files with type changes, creating potential merge conflicts despite both committing cleanly to the same branch. Prevention: (1) map file dependencies before dispatch, (2) assign agents to distinct modules, (3) use separate branches per agent when overlap is unavoidable, (4) plan agent handoff sequence explicitly. For large reviews >50 findings, consider sequential phases on architectural changes.
