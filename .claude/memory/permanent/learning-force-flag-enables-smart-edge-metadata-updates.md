---
id: learning-force-flag-enables-smart-edge-metadata-updates
title: Force flag enables smart edge metadata updates
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-19T14:50:18.842Z"
updated: "2026-02-19T14:51:55.490Z"
tags:
  - suggest-links
  - edge-updates
  - optimization
  - project
---

Added --force flag to suggest-links that intelligently updates existing edge metadata (similarity, verifiedRelation). Smart bypass prevents redundant writes by only updating when metadata differs—running same command twice will skip if nothing changed.
