---
id: gotcha-retro-memory-scope-moves-orphan-existing-cross-scope-links
title: Retro - Memory scope moves orphan existing cross-scope links
type: gotcha
scope: project
created: "2026-01-16T23:12:37.583Z"
updated: "2026-01-16T23:12:37.583Z"
tags:
  - retrospective
  - process
  - memory-maintenance
  - project
severity: medium
---

Moving memories between scopes (project→user, local→project) broke 59 cross-scope edges. Health check: score dropped to 70/100 from 94/100. This is expected behaviour (design prevents cross-scope edges from surviving moves), but means post-migration linking is needed. Future sessions should run memory-curator after bulk scope moves to repair orphaned nodes and restore connectivity ratio.
