---
id: gotcha-retro-error-swallowing-as-explicit-code-review-category
title: Retro - Error swallowing as explicit code review category
type: gotcha
scope: project
created: "2026-02-23T14:49:32.746Z"
updated: "2026-02-23T14:49:32.746Z"
tags:
  - retrospective
  - process
  - code-review
  - security
  - project
severity: medium
---

Silent catch blocks and error suppression patterns were not initially flagged in security audit. Code review for security work should explicitly scan for: (1) bare catch {} blocks, (2) catch that logs nothing, (3) error swallowing in loops. Add as explicit checklist item for security-focused reviews.
