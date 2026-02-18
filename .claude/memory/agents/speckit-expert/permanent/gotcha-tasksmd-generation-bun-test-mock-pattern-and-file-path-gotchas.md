---
id: gotcha-tasksmd-generation-bun-test-mock-pattern-and-file-path-gotchas
title: "tasks.md generation: Bun test mock pattern and file path gotchas"
type: gotcha
scope: project
agent: speckit-expert
created: "2026-02-18T11:38:39.457Z"
updated: "2026-02-18T11:38:39.457Z"
tags:
  - speckit
  - tasks-generation
  - bun
  - claude-memory-plugin
  - v1.5.0
  - project
---

When generating tasks.md for the claude-memory-plugin project:

1. Test framework is Bun (bun:test), NOT Vitest. Use mock.module() not vi.mock(). Always note this in the tasks.md Notes section.

2. The graph/ directory contains BOTH graph-structure.ts/spec and structure.ts/spec. The plan.md refers to structure.ts (not graph-structure.ts). Check actual file existence with Glob before assuming paths.

3. No contracts/ directory was created for this feature — check before reading.

4. New files to be created have no existing spec file. The link-update.spec.ts and check-relevance.spec.ts and services/ollama.spec.ts are all new files.

5. CLI commands file for graph operations is cli/commands/graph.ts (and graph.spec.ts exists).

6. Package boundary: hooks/ and skills/memory/ are independent — no cross-package imports allowed in either direction.

7. Phase C and Phase D can run in parallel after Phase B completes — document this explicitly in the parallel strategy.
