---
id: learning-retro-tdd-catches-security-regressions
title: Retro - TDD catches security regressions
type: learning
scope: project
created: "2026-01-16T22:27:50.477Z"
updated: "2026-01-16T22:27:50.477Z"
tags:
  - retrospective
  - process
  - security
  - tdd
  - project
severity: high
---

Writing tests for the protect-approvals-directory hook before implementation exposed a regex vulnerability that would have allowed approval bypass. TDD enforcement ensures security checks are tested, not just assumed.
