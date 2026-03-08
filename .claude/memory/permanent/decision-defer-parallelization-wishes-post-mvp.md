---
id: decision-defer-parallelization-wishes-post-mvp
title: Defer Parallelization & Style Wishes to Post-MVP
type: decision
scope: project
project: claude-memory-plugin
created: "2026-03-08T19:23:26.930Z"
updated: "2026-03-08T19:23:30.017Z"
tags:
  - feature-006
  - prioritisation
  - scope-management
  - project
---

After fixing all critical (0), high (4), and medium (8) findings in Feature 006, deferred 3 items: parallelise per-type summaries, parallelise listMemories reads, use Math.max(...spread) for findMaxTokens. These are performance/style wishes, not correctness issues. Ship now, optimise in post-MVP round. Scope mgmt: must-fix vs should-fix prioritisation.
