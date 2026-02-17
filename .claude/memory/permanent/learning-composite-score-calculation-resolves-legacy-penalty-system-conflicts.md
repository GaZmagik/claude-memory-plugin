---
id: learning-composite-score-calculation-resolves-legacy-penalty-system-conflicts
title: Composite score calculation resolves legacy penalty system conflicts
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-05T23:49:03.193Z"
updated: "2026-02-16T22:30:07.501Z"
tags:
  - health-scoring
  - cmdHealth
  - test-alignment
  - penalty-systems
  - project
---

cmdHealth health score must be computed from breakdown values (connectivity, orphanRatio, integrity averages) not report.score (legacy 3-pt penalty system). For all-orphan graphs: connectivity=0, orphanRatio=0, integrity=100 → avg≈33, correctly <50. Resolves test expectations that legacy penalty math was too lenient.
