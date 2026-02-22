---
id: learning-gotcha-mock-embeddings-test-mismatch-on-actual-api-input
title: "Gotcha: Mock embeddings test mismatch on actual API input"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-20T15:07:30.850Z"
updated: "2026-02-20T17:46:02.566Z"
tags:
  - testing
  - mocks
  - embeddings
  - gotcha
  - project
---

Tests using mocked embedding providers (mockProvider) must match the exact API structure of the real provider. suggestLinks takes no sourceId parameter and returns suggestions (not candidates). Mock mismatches are detected only when tests run against actual API structure.
