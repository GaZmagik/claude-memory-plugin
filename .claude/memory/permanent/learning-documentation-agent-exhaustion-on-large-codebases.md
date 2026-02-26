---
id: learning-documentation-agent-exhaustion-on-large-codebases
title: Documentation agent exhaustion on large codebases
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-26T19:13:28.706Z"
updated: "2026-02-26T19:14:22.266Z"
tags:
  - code-review
  - agent-limits
  - documentation
  - token-budget
  - project
---

Haiku model ran out of tokens when analyzing 525 TypeScript files for documentation accuracy. For multi-agent code reviews on large codebases, consider pre-aggregating file listings, chunking by module, or using streaming summaries to keep agent contexts within budget.
