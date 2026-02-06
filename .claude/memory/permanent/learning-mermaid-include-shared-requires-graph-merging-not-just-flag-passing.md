---
id: learning-mermaid-include-shared-requires-graph-merging-not-just-flag-passing
title: Mermaid --include-shared requires graph merging not just flag passing
type: learning
scope: project
created: "2026-02-06T00:28:33.227Z"
updated: "2026-02-06T00:28:33.227Z"
tags:
  - mermaid
  - phase-e
  - architecture
  - project
---

Agent-filtered mermaid diagrams need project/global graphs loaded and merged at command level, not just flag-passing to generateMermaid. The graph loading happens before filtering, so single-graph loads miss shared nodes entirely.
