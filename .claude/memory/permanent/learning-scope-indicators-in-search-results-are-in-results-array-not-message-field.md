---
id: learning-scope-indicators-in-search-results-are-in-results-array-not-message-field
title: Scope indicators in search results are in results array, not message field
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-04T13:20:12.265Z"
updated: "2026-02-16T22:30:07.569Z"
tags:
  - testing
  - scope-indicators
  - phase-d
  - project
---

Phase D tests expected scope indicators ([scope] id format) in the message string, but formatScopedResult() applies them to the results array. Message field contains only the summary. Test assertions must check result.data.results, not result.message.
