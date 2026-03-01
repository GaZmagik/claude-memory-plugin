---
id: learning-stale-api-mocks-create-vacuous-test-passes
title: Stale API mocks create vacuous test passes without real coverage
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-27T00:04:05.185Z"
updated: "2026-02-27T00:04:17.214Z"
tags:
  - testing
  - test-quality
  - mocks
  - code-review
  - project
---

Tests that mock removed or unused APIs pass silently even when not exercising real code paths. The cross-scope suggest-links test passed vacuously because it mocked findSimilarMemories (which production never called) and skipped assertions when no calls occurred. Pattern: Always verify that mocked APIs are actually used in production code before trusting test results.
