---
id: learning-retro-deferring-large-architectural-refactors-to-separate-prs-keeps-momentum
title: Retro - Deferring large architectural refactors to separate PRs keeps momentum
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-27T17:16:21.509Z"
updated: "2026-02-27T17:16:35.896Z"
tags:
  - retrospective
  - process
  - scope-management
  - git-workflow
  - project
severity: medium
---

When reviewing code and encountering large refactoring opportunities (H8/H9: file extraction candidates of 525/788 lines), explicitly assess whether they belong in the current PR scope. Deferring to separate dedicated PRs prevents scope creep and keeps momentum on achievable fixes. The session successfully deferred H8/H9 and compiler config changes (M19-M23) which would have tripled the PR size.
