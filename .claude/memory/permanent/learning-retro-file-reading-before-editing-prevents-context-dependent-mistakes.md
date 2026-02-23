---
id: learning-retro-file-reading-before-editing-prevents-context-dependent-mistakes
title: Retro - File reading before editing prevents context-dependent mistakes
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-22T16:51:28.606Z"
updated: "2026-02-22T16:52:10.646Z"
tags:
  - retrospective
  - process
  - code-quality
  - project
severity: high
---

Session consistently read files first before any Edit operations. This allowed identification of surrounding context (variable names, comments, patterns) that disambiguated between duplicate code patterns. When replacing multiple occurrences of similar code (e.g., 6 instances of 'results.map((result: any)'), reading context allowed precise targeted replacements without hitting wrong sites. This practice proved essential for bulk refactoring.
