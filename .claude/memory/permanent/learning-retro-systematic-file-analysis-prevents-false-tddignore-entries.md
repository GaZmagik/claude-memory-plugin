---
id: learning-retro-systematic-file-analysis-prevents-false-tddignore-entries
title: Retro - Systematic file analysis prevents false .tddignore entries
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T12:16:33.518Z"
updated: "2026-02-23T12:16:50.936Z"
tags:
  - retrospective
  - process
  - testing
  - tdd-parity
  - project
severity: medium
---

When facing multiple untested functions, the approach of reading each file to classify it (genuinely needs tests vs. intentional exclusion) prevents false .tddignore entries and maintains clearer test coverage semantics. Example: Rather than blanking out 45 untested functions, systematically reading files like circuit-breaker.ts, auto-selector.ts, and validate-agent-info.ts revealed which were truly untested vs. covered by cross-cutting feature specs. Result: Only legitimate exclusions added, no semantic drift. Takes longer per-file but produces accurate exclusion semantics.
