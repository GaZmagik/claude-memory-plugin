---
id: learning-retro-non-blocking-config-provisioning-improves-onboarding
title: Retro - Non-blocking config provisioning improves onboarding
type: learning
scope: project
created: "2026-01-22T08:24:43.619Z"
updated: "2026-01-22T08:24:43.619Z"
tags:
  - retrospective
  - process
  - onboarding
  - hooks
  - project
severity: medium
---

Automatically provisioning template files (like memory.example.md) in hooks with fire-and-forget error handling improves user onboarding without blocking core operations. The UserPromptSubmit hook approach was effective: check for file existence, copy template if missing, catch all errors silently. This pattern works well for optional setup tasks.
