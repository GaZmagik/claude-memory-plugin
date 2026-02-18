---
id: learning-stub-first-tdd-across-multiple-coordination-points-accelerates-multi-file-phases
title: Stub-first TDD across multiple coordination points accelerates multi-file phases
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-18T18:11:30.707Z"
updated: "2026-02-18T18:11:45.694Z"
tags:
  - tdd
  - coordination
  - multi-file
  - phase-d
  - project
---

Phase D: write all failing test assertions first (generate toHaveBeenCalledWith 300s, 60s), then wire implementation across three files (ollama, link-update, suggest-links) in parallel. Forces clear contracts, reduces back-and-forth, eliminates integration surprises. All 40 Phase D tests passing with zero regressions.
