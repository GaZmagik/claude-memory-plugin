---
id: learning-retro-grep-for-patterns-before-implementing-prevents-api-assumption-errors
title: Retro - Grep for patterns before implementing prevents API assumption errors
type: learning
scope: project
project: claude-memory-plugin
created: "2026-03-08T00:35:07.575Z"
updated: "2026-03-08T00:35:38.184Z"
tags:
  - retrospective
  - process
  - pattern-analysis
  - integration
  - project
severity: low
---

Before implementing cmdSummarize, grepping for existing CLI helper patterns (wrapOperation, getFlagString, validateIncludeShared) revealed the actual API surface and prevented wrong assumptions (e.g., misunderstanding wrapOperation expects static strings, not functions). Always scan codebase for patterns when integrating into existing systems.
