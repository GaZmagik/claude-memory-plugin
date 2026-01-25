---
id: learning-v110-implementation-10-documented-gotchas-require-proactive-handling
title: "v1.1.0 implementation: 10 documented gotchas require proactive handling"
type: learning
scope: project
created: "2026-01-25T09:59:01.981Z"
updated: "2026-01-25T09:59:01.981Z"
tags:
  - v1.1.0
  - gotchas
  - implementation
  - testing
  - ollama
  - project
---

Memory restoration identified 10 critical gotchas for v1.1.0 work: (1) Ollama cold-start latency (10s+) needs spinner for --auto flag, (2) execFileSync loses PATH in Bun subprocesses—use absolute paths, (3) vi.mock() causes test pollution in coverage mode across 4 files, (4) Promise truthiness masks missing await, (5) discovery.ts uses process.cwd() breaking test isolation, (6) embedding context length causes silent 500 errors—content must be truncated, plus 4 others. Flag these at start of Phase 1.
