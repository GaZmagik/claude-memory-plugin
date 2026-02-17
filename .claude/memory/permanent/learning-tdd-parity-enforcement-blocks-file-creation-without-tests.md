---
id: learning-tdd-parity-enforcement-blocks-file-creation-without-tests
title: TDD parity enforcement blocks file creation without tests
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-04T18:03:47.848Z"
updated: "2026-02-16T22:30:07.454Z"
tags:
  - tdd
  - testing
  - hooks
  - enforcement
  - project
---

The TDD hook enforces test-first development by preventing file creation via Write tool until tests exist. Use Bash touch to create stub files first, then Write to populate them. This ensures red-green-refactor discipline.
