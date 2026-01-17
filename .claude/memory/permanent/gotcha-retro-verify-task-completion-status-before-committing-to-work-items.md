---
id: gotcha-retro-verify-task-completion-status-before-committing-to-work-items
title: Retro - Verify task completion status before committing to work items
type: gotcha
scope: project
created: "2026-01-17T21:30:54.129Z"
updated: "2026-01-17T21:30:54.129Z"
tags:
  - retrospective
  - process
  - task-planning
  - project
severity: medium
---

When working from a review report with multiple action items, verify which items are actually incomplete before starting work. In this session, the user asked to work on item #3 (hook-level timeout enforcement), but investigation revealed it was already implemented via the withTimeout wrapper in runHook. This cost initial effort. Lesson: Do upfront verification (git grep, code inspection) on all 'Must Fix' items before committing to the task.
