---
id: gotcha-gotcha-graph-edge-loss-silently-corrupts-state-without-validation
title: Gotcha - Graph edge loss silently corrupts state without validation
type: gotcha
scope: project
created: "2026-01-17T10:26:56.793Z"
updated: "2026-01-17T10:26:56.793Z"
tags:
  - retrospective
  - process
  - data-integrity
  - project
severity: high
---

Commit fe102a8 wiped 267 edges from graph.json while keeping nodes intact. The CLI accepted an empty edges array without warning or pre-write validation. This demonstrates the need for: (1) schema validation before persisting graph.json (reject empty edges if nodes exist), (2) pre-write checksums or diffs, (3) graph health checks in CI/CD pipeline. Silent data loss is more dangerous than loudly failing.
