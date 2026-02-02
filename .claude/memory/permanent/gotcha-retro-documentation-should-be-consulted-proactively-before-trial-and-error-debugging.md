---
id: gotcha-retro-documentation-should-be-consulted-proactively-before-trial-and-error-debugging
title: Retro - Documentation should be consulted proactively before trial-and-error debugging
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-17T19:14:43.249Z"
updated: "2026-02-01T22:38:06.458Z"
tags:
  - retrospective
  - process
  - debugging
  - project
severity: medium
---

Spent multiple hook reinstall cycles testing different output combinations (exit 0/2, stdout/stderr, JSON formats) before discovering Claude Code docs had the answer. Should read framework docs first, then test edge cases. Trial-and-error is expensive when reinstalls required.
