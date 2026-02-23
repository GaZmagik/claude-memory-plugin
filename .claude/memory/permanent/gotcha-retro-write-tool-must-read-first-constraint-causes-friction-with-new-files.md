---
id: gotcha-retro-write-tool-must-read-first-constraint-causes-friction-with-new-files
title: Retro - Write tool 'must read first' constraint causes friction with new files
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T12:30:44.077Z"
updated: "2026-02-23T12:31:02.998Z"
tags:
  - retrospective
  - process
  - tooling
  - project
severity: medium
---

The Write tool requires files to be read before writing, even for new files that don't exist yet. This causes backtracking: attempting Write → getting error → reading the file (which fails/returns empty) → then writing. For new test files, the Read tool returns an error or empty content, but the Write tool still requires the Read first. Consider: (a) improving error messaging to explain the constraint, or (b) allowing Write to skip the read constraint for new files.
