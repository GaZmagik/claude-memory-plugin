---
id: gotcha-gotcha-speckitreview-on-massive-codebases-hits-context-limits-mid-aggregation
title: Gotcha - Speckit.review on massive codebases hits context limits mid-aggregation
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-17T01:07:44.551Z"
updated: "2026-02-01T22:38:06.519Z"
tags:
  - retrospective
  - process
  - speckit
  - context-limits
  - project
severity: high
---

Launching 7 expert agents on a 504-file, 170k-line feature branch causes context saturation when aggregating findings. The code-quality-expert (Opus) completed successfully with detailed findings, but the final consolidation phase couldn't finish in main session context. Solution: For very large reviews, either (a) run agents sequentially with smaller scope, (b) use a dedicated aggregation pass after all agents complete, or (c) invoke review on staged features rather than entire branches.
