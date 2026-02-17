---
id: gotcha-deferring-help-text-updates-to-final-task-created-time-pressure
title: Gotcha - Deferring help text updates to final task created time pressure
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-04T10:58:01.061Z"
updated: "2026-02-16T22:30:07.485Z"
tags:
  - retrospective
  - process
  - documentation
  - phase-d
  - project
severity: medium
---

Original Phase D task list deferred all help text updates (--agent, --include-shared flags) to final task T#20. This created: (1) Risk of incomplete documentation if task ran out of time, (2) Difficulty verifying feature was production-ready without help text, (3) Last-minute rush to update 5+ command entries. Better approach: Update help text incrementally as each command is implemented. Documentation should be "done" when feature is done, not an afterthought.
