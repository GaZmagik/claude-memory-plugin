---
id: learning-retro-task-completion-validation-prevents-hidden-rework
title: Retro - Task completion validation prevents hidden rework
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-03T19:29:06.815Z"
updated: "2026-02-16T22:30:07.335Z"
tags:
  - retrospective
  - process
  - task-completion
  - phase-b
  - project
severity: medium
---

Several Phase B tasks were marked complete but had incomplete implementations (write.ts missing agent field in response, getScopeTag missing agent scope cases). Root cause: No validation step before marking done. Solution: Before closing a feature task, run tests for that component. Test Red phase catches issues early. If tests don't pass, task isn't complete. This session discovered incomplete work when tests ran - would have been found immediately if tests were run before 'done' marking.
