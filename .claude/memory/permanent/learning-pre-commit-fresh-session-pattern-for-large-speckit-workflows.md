---
id: learning-pre-commit-fresh-session-pattern-for-large-speckit-workflows
title: Pre-commit fresh-session pattern for large speckit workflows
type: learning
scope: project
created: "2026-01-24T23:43:17.572Z"
updated: "2026-01-24T23:43:17.572Z"
tags:
  - context-management
  - speckit
  - session-planning
  - v1.1.0
  - project
---

At 84% context after completing speckit:plan → speckit:tasks → speckit:analyze, committing all spec changes and starting fresh session prevents context exhaustion during 103-task implementation across 5 phases. Allows dedicated implementation session with clean context budget.
