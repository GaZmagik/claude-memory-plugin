---
id: gotcha-retro-plan-interactive-confirmation-upfront-for-destructive-cli-operations
title: Retro - Plan interactive confirmation upfront for destructive CLI operations
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-04T18:03:08.978Z"
updated: "2026-02-16T22:30:07.259Z"
tags:
  - retrospective
  - process
  - cli-design
  - project
severity: high
---

Phase F plan includes confirmDeletion() using prompts library, but non-TTY environment handling (CI/CD, piped commands) was only addressed in gotchas section, not design. Future phases with destructive operations should: (1) detect TTY early, (2) require --force flag in non-interactive contexts, (3) test both TTY and non-TTY paths. The prompts library behavior differs significantly between environments.
