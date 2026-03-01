---
id: decision-defer-large-refactors-from-code-reviews
title: Defer large refactors to separate PRs
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-26T21:59:28.408Z"
updated: "2026-02-26T21:59:31.086Z"
tags:
  - architecture
  - code-review
  - refactoring
  - scope-management
  - project
---

Identified H7-H9 (resolveBasePath extraction, writeMemory breakup, memory-context monolith split) as 200+ line architectural refactors. Deferred to separate PRs to preserve review focus and prevent scope creep. Large refactors block reviews; dispatch them separately.
