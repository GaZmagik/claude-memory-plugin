---
id: learning-retro-composite-scoring-resolves-legacy-penalty-system-conflicts
title: Retro - Composite scoring resolves legacy penalty system conflicts
type: learning
scope: project
created: "2026-02-05T23:47:59.542Z"
updated: "2026-02-05T23:47:59.542Z"
tags:
  - retrospective
  - process
  - phase-e
  - scoring
  - project
severity: medium
---

When migrating cmdHealth to agent-scoped checks, initial implementation delegated to checkHealth() which uses a lenient penalty system (9 points for 3 orphans = score 91). For all-orphan graphs, this doesn't reflect true unhealthiness. Solution: Compute score from breakdown values (connectivity + orphanRatio + integrity) / 3. For 3 orphans: 0 + 0 + 100 = 33, accurately reflecting poor health. Key insight: When response format changes, audit the scoring logic separately from the data structure changes.
