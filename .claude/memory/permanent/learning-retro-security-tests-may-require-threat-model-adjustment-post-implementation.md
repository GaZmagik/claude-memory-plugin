---
id: learning-retro-security-tests-may-require-threat-model-adjustment-post-implementation
title: Retro - Security tests may require threat model adjustment post-implementation
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T14:49:24.818Z"
updated: "2026-02-23T17:29:22.680Z"
tags:
  - retrospective
  - process
  - tdd-security
  - project
severity: medium
---

When writing Red-phase security tests, the test assertions sometimes reflect aspirational threat model rather than realistic one. After Green (implementation), security tests often need adjustment to match what the actual fix provides (e.g., structural delimiting + validation rather than complete payload erasure). Include threat model review in Green→Refactor transition for security work.
