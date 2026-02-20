---
id: gotcha-mock-embeddings-test-mismatch-on-actual-api-input
title: Mock embeddings test mismatch on actual API input
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-19T17:59:03.379Z"
updated: "2026-02-19T18:01:27.568Z"
tags:
  - testing
  - mocking
  - embeddings
  - project
---

When mocking getEmbedding() in tests, the mock must return embeddings based on the *actual* text passed to the API, not assumed text. indexExternalFiles passes entry.title, not file content. Mismatched input caused silent test failures (analysed: 0) where semantic similarity checks found no pairs.
