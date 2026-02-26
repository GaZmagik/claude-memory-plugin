---
id: gotcha-retro-parallel-agents-on-overlapping-code-create-cascading-type-mismatches
title: "Gotcha - Retro: Parallel agents on overlapping code create cascading type mismatches"
type: gotcha
scope: project
created: "2026-02-26T22:37:25.016Z"
updated: "2026-02-26T22:37:25.016Z"
tags:
  - retrospective
  - process
  - agent-coordination
  - gotcha
  - project
severity: high
---

Phase 5 agent changed MemoryType enum definition, which cascaded through 138 integration tests that used the old type patterns. This happened because parallel agents were working on overlapping code sections without explicit phase boundaries. Prevention: clearly define code phase boundaries before dispatching parallel agents; verify that each agent has exclusive access to its code section; use git status --short to verify no overlapping file modifications before committing parallel agent work.
