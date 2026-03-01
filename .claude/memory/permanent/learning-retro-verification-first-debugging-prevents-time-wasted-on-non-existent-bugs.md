---
id: learning-retro-verification-first-debugging-prevents-time-wasted-on-non-existent-bugs
title: Retro - Verification-first debugging prevents time wasted on non-existent bugs
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-27T17:16:12.867Z"
updated: "2026-02-27T17:16:35.842Z"
tags:
  - retrospective
  - process
  - debugging
  - testing
  - project
severity: medium
---

When discovering test failures after code changes, immediately verify via git stash whether failures are pre-existing. This prevents wasting time debugging changes that didn't cause the failure. Applied successfully in suggest-links optimisation where 14 failures proved pre-existing.
