---
id: gotcha-phase-e-test-directory-structure-needs-early-verification-against-project-conventions
title: Gotcha - Phase E test directory structure needs early verification against project conventions
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-05T13:31:22.580Z"
updated: "2026-02-16T22:30:07.434Z"
tags:
  - retrospective
  - process
  - testing
  - directories
  - project
severity: medium
---

Created test files across display/, graph/, agents/, and integration/ directories but didn't verify these match existing project patterns early. Future phases should check `git ls-files` for existing test directory patterns before creating new subdirectories. Risk: tests in wrong locations could be skipped by CI or require reorganization later.
