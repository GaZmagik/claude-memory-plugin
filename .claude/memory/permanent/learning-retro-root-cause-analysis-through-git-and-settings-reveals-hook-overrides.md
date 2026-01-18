---
id: learning-retro-root-cause-analysis-through-git-and-settings-reveals-hook-overrides
title: Retro - Root cause analysis through git and settings reveals hook overrides
type: learning
scope: project
created: "2026-01-17T17:17:21.349Z"
updated: "2026-01-17T17:22:14.120Z"
tags:
  - retrospective
  - process
  - debugging
  - project
  - global-settings
severity: medium
---

When hooks fail unexpectedly, check: 1) global settings.json for entries that override project hooks, 2) git history to see recent changes, 3) which version is running (dev vs installed). The memory-commit issue was traced by comparing error messages against hook implementations - global hook was old forked-session approach while plugin had correct implementation.
