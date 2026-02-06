---
id: gotcha-pre-compact-session-consumed-entirely-by-restoration-ceremony
title: Pre-compact session consumed entirely by restoration ceremony
type: gotcha
scope: project
created: "2026-02-06T08:52:05.088Z"
updated: "2026-02-06T08:52:05.088Z"
tags:
  - restoration
  - compaction
  - efficiency
  - project
---

When /session-restore is invoked after compaction, the entire session context budget is consumed by preservation ceremonies (memory recall, curator, gotchas agents) with zero time remaining for implementing work marked in-progress. The main work (T137 performance tests) never started despite being flagged as active. Restoration agents should be lightweight or batched differently.
