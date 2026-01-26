---
id: learning-retro-extract-shared-helpers-from-duplicated-code-paths-early-in-refactoring
title: Retro - Extract shared helpers from duplicated code paths early in refactoring
type: learning
scope: project
created: "2026-01-26T16:41:58.767Z"
updated: "2026-01-26T16:41:58.767Z"
tags:
  - retrospective
  - process
  - refactoring
  - code-quality
  - project
severity: low
---

When refactoring code with similar error handling/resolution patterns across multiple functions, extracting shared helpers (like resolveStyleAndAgent with strict/lenient modes) is high-leverage. It reduced ai-invoke.ts by 53 lines while improving maintainability. Identify duplication patterns early and extract before other changes.
