---
id: learning-cross-scope-graph-non-atomicity-risk
title: Cross-Scope Graph Non-Atomicity Risk
type: learning
scope: project
created: "2026-02-06T20:43:48.138Z"
updated: "2026-02-06T20:43:48.138Z"
tags:
  - gotcha
  - concurrency
  - graph
  - phase-d-deferred
  - project
---

Bidirectional edge storage requires writing to two separate graph.json files simultaneously (agent graph + project graph). Without transactions, failures mid-operation leave graphs inconsistent. Phase D-DEFERRED uses best-effort cleanup: if one graph is unreachable, deletion proceeds anyway rather than blocking.
