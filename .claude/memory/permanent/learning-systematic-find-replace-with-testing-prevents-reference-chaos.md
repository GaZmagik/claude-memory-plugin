---
id: learning-systematic-find-replace-with-testing-prevents-reference-chaos
title: Systematic find-replace with testing prevents reference chaos
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-15T18:46:11.030Z"
updated: "2026-01-16T13:44:26.666Z"
tags:
  - process
  - refactoring
  - testing
  - retrospective
  - project
---

When renaming components across a codebase, testing after each logical group of changes (rather than all-at-once) catches reference update mistakes before they accumulate. Command renames spread across 7 files caught 2 incomplete updates early through targeted tests.
