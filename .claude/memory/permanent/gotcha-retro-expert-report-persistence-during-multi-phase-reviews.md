---
id: gotcha-retro-expert-report-persistence-during-multi-phase-reviews
title: Retro - Expert report persistence during multi-phase reviews
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-06T23:49:07.383Z"
updated: "2026-02-16T22:30:06.998Z"
tags:
  - retrospective
  - process
  - review-workflow
  - gotcha
  - project
severity: medium
---

During speckit:review, all 7 expert agent outputs were generated but task output files were cleaned up before the retrospective could retrieve them. The consolidated review report was saved to .specify/ but individual expert findings were lost. Next time: either (a) save all expert outputs to .specify/ immediately after TaskOutput calls, or (b) have agents output to a persistent file path rather than relying on internal task storage.
