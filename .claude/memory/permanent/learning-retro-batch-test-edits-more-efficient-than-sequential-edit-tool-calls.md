---
id: learning-retro-batch-test-edits-more-efficient-than-sequential-edit-tool-calls
title: Retro - Batch test edits more efficient than sequential Edit tool calls
type: learning
scope: project
created: "2026-01-18T15:16:06.290Z"
updated: "2026-01-18T15:16:06.290Z"
tags:
  - retrospective
  - process
  - testing
  - project
severity: low
---

Converting fs-utils.spec.ts tests to async required many identical changes (adding async, await, changing assertions). Sequential Edit tool calls (one per describe block) was tedious. More efficient approach: read entire file, identify patterns, design batch transformation strategy, use fewer larger edits. For next test conversion, map all changes first.
