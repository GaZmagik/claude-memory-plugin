---
id: learning-phase-c-cli-architecture-requires-helpers-refactoring-as-critical-bottleneck
title: Phase C CLI architecture requires helpers refactoring as critical bottleneck
type: learning
scope: project
created: "2026-02-03T20:54:44.753Z"
updated: "2026-02-03T20:54:44.753Z"
tags:
  - phase-c
  - cli
  - architecture
  - refactoring
  - project
---

Parser already handles --agent flag generically. Storage layer (Phase B) complete. Missing link is CLI helpers refactoring to bridge parser → storage. All 15 commands follow identical update pattern, reducing implementation risk.
