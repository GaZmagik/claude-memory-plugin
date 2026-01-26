---
id: learning-tdd-parity-enforcement-catches-undocumented-test-files
title: TDD parity enforcement catches undocumented test files
type: learning
scope: project
created: "2026-01-25T20:51:49.410Z"
updated: "2026-01-25T20:51:49.410Z"
tags:
  - tdd
  - testing
  - hooks
  - parity
  - v1.1.0
  - project
---

The TDD parity hook enforces 1:1 correspondence between source and test files. During v1.1.0 implementation, this caught test files that were created but not yet documented in .tddignore. The hook prevented accidental test file creation without corresponding implementation or explicit exemption.
