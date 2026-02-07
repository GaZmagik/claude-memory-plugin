---
id: decision-phase-d-deferred-cross-scope-graph-operations-complete
title: Phase D-DEFERRED Cross-Scope Graph Operations Complete
type: decision
scope: project
created: "2026-02-06T21:22:41.965Z"
updated: "2026-02-06T21:22:41.965Z"
tags:
  - phase-d
  - cross-scope
  - graph
  - architecture
  - milestone
  - project
---

Implemented bidirectional cross-scope linking between memories in different scopes (agent-to-project, project-to-agent, agent-to-agent). 25 tasks (TD01-TD25) across 5 sub-phases completed with TDD discipline.

Key Decisions:
- Edge mirroring (not reversal): same edge stored in both graphs
- Save order: source graph first, then target (non-atomic but detectable)
- Best-effort cleanup: when other graph is inaccessible, operations succeed
- Cross-scope detection via --target-agent flag, not --include-shared
- loadMergedGraph() extracted from mermaid pattern for reusable graph merging
- calculateImpact() and findOrphanedNodes() work unchanged on merged graphs
- Test isolation fix: use os.homedir() not captured cwd in afterEach

Files Modified: graph/structure.ts, graph/edges.ts, graph/link.ts, core/delete.ts, cli/commands/graph.ts, cli/commands/query.ts, types/operations.ts, types/memory.ts, validation-include-shared.spec.ts

Test Results: 2552 pass, 0 fail across 158 files
