---
id: learning-baseline-test-failures-before-success
title: Always baseline test failures before claiming success
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-22T17:31:31.352Z"
updated: "2026-02-22T17:31:42.879Z"
tags:
  - testing
  - validation
  - quality-assurance
  - project
---

Feature 005 showed 11 test failures on first run. Stashing changes and re-running confirmed all were pre-existing baseline failures, unrelated to PR changes. Critical for distinguishing regressions from known issues.
